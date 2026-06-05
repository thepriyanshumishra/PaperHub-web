import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import SearchAnalytics from '@/models/searchAnalytics';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

// Helper for lightweight Levenshtein distance check for JS-based fuzzy matching
function checkLevenshteinDistance(s1: string, s2: string, maxDist = 2): boolean {
  if (Math.abs(s1.length - s2.length) > maxDist) return false;
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return track[s2.length][s1.length] <= maxDist;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim() || '';
    const subjectId = searchParams.get('subjectId');
    const unit = searchParams.get('unit');
    const topic = searchParams.get('topic');
    const year = searchParams.get('year');
    const difficulty = searchParams.get('difficulty');
    const marks = searchParams.get('marks');
    const verificationStatus = searchParams.get('verificationStatus');

    // Build the query object
    const query: any = {};

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = new mongoose.Types.ObjectId(subjectId);
    }
    if (unit) {
      query.unit = parseInt(unit, 10);
    }
    if (topic) {
      query.topic = { $regex: topic, $options: 'i' };
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (marks) {
      query.marks = parseInt(marks, 10);
    }
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    } else {
      query.verificationStatus = 'verified';
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      query.$or = [
        { lastAppearedYear: parsedYear },
        { 'sourcePapers.year': parsedYear }
      ];
    }

    let questions = [];

    // If a text search keyword is provided
    if (q) {
      // 1. Try Mongo text index search first (fully indexed, fast)
      const textQuery = { ...query, $text: { $search: q } };
      questions = await Question.find(textQuery)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } } as any)
        .limit(50)
        .lean();

      // 2. Fallback to case-insensitive partial matching (regex) only if text search yields nothing
      if (questions.length === 0) {
        const regexQuery = {
          ...query,
          $or: [
            ...(query.$or || []),
            { questionText: { $regex: q, $options: 'i' } },
            { topic: { $regex: q, $options: 'i' } }
          ]
        };
        questions = await Question.find(regexQuery).limit(50).lean();
      }

      // 3. Fallback to JS-based typo-tolerant fuzzy token matching only if both yield nothing
      if (questions.length === 0) {
        const candidateQuestions = await Question.find(query).limit(150).lean();
        const queryTokens = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

        if (queryTokens.length > 0) {
          questions = candidateQuestions.filter((questionDoc) => {
            const text = (questionDoc.questionText || '').toLowerCase();
            const topicName = (questionDoc.topic || '').toLowerCase();

            return queryTokens.some((token) => {
              if (text.includes(token) || topicName.includes(token)) return true;

              // Check Levenshtein distance for words
              const words = `${text} ${topicName}`.split(/\s+/);
              return words.some((word) =>
                checkLevenshteinDistance(token, word, Math.floor(token.length / 3) || 1)
              );
            });
          }).slice(0, 50);
        }
      }

      // Log search query in SearchAnalytics logging system
      try {
        await SearchAnalytics.create({
          userId: verifiedUser.uid,
          query: q,
          subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? new mongoose.Types.ObjectId(subjectId) : undefined,
          topic: topic || undefined
        });
      } catch (err) {
        console.error('Failed to log search analytics:', err);
      }

    } else {
      // If no query parameter, simple retrieval
      questions = await Question.find(query).sort({ updatedAt: -1 }).limit(50).lean();
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('API Error in GET /api/questions/search:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
