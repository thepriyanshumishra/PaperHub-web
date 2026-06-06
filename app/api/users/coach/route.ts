import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Session from '@/models/session';
import { groq, isAiEnabled } from '@/lib/groq';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();

    // 1. Gather analytics for deterministic insights
    const performances = await UserTopicPerformance.find({ userId: user._id }).lean();

    // Find weak and strong topics based on actual accuracy
    const activePerformances = performances.filter((p) => p.attempted > 0);
    
    // Sort to find weakest and strongest
    const weakSorted = [...activePerformances]
      .filter((p) => (p.correct / p.attempted) <= 0.5)
      .sort((a, b) => (a.correct / a.attempted) - (b.correct / b.attempted));
    
    const strongSorted = [...activePerformances]
      .filter((p) => (p.correct / p.attempted) >= 0.8)
      .sort((a, b) => (b.correct / b.attempted) - (a.correct / a.attempted));

    // Helper functions to avoid any divide-by-zero TS safety warnings
    const weakestTopicAttempted = (p: any) => p.attempted || 1;
    const strongestTopicAttempted = (p: any) => p.attempted || 1;

    const weakestTopic = weakSorted[0] ? `${weakSorted[0].topic} (${Math.round((weakSorted[0].correct / weakestTopicAttempted(weakSorted[0])) * 100)}% accuracy)` : null;
    const strongestTopic = strongSorted[0] ? `${strongSorted[0].topic} (${Math.round((strongSorted[0].correct / strongestTopicAttempted(strongSorted[0])) * 100)}% accuracy)` : null;

    // Calculate accuracy improvement from recent vs older sessions
    const completedSessions = await Session.find({ userId: user._id, status: 'completed' })
      .sort({ endedAt: -1 })
      .limit(10)
      .lean();

    let accuracyDeltaMessage = '';
    let hasSignificantImprovement = false;

    if (completedSessions.length >= 4) {
      // Split into two halves
      const mid = Math.floor(completedSessions.length / 2);
      const recentSessions = completedSessions.slice(0, mid);
      const olderSessions = completedSessions.slice(mid);

      const getAccuracy = (sessionsList: any[]) => {
        let attempted = 0;
        let correct = 0;
        sessionsList.forEach((s) => {
          if (s.testResponses) {
            s.testResponses.forEach((r: any) => {
              attempted += 1;
              if (r.selfScore === 'correct' || r.score === 100) correct += 1;
            });
          } else if (s.evaluationResult?.details) {
            s.evaluationResult.details.forEach(() => {
              attempted += 1;
            });
            // Approximate correct from marks
            const ratio = (s.evaluationResult.obtainedMarks || 0) / (s.evaluationResult.totalMarks || 1);
            correct += Math.round(ratio * s.evaluationResult.details.length);
          }
        });
        return attempted > 0 ? (correct / attempted) : null;
      };

      const recentAccuracy = getAccuracy(recentSessions);
      const olderAccuracy = getAccuracy(olderSessions);

      if (recentAccuracy !== null && olderAccuracy !== null) {
        const diff = Math.round((recentAccuracy - olderAccuracy) * 100);
        if (diff > 0) {
          accuracyDeltaMessage = `Your accuracy improved by ${diff}% over recent sessions.`;
          hasSignificantImprovement = true;
        } else if (diff < 0) {
          accuracyDeltaMessage = `Your accuracy dropped by ${Math.abs(diff)}% recently. Review your mistake checklist.`;
        }
      }
    }

    const deterministicInsights: string[] = [];
    
    // Add streak insight
    if (user.engagement?.streakCount > 3) {
      deterministicInsights.push(`Current streak: ${user.engagement.streakCount} active days! Keep the flame burning.`);
    } else if (user.engagement?.streakCount > 0) {
      deterministicInsights.push(`Current streak: ${user.engagement.streakCount} days. Solve a daily goal question to build your momentum.`);
    } else {
      deterministicInsights.push('Current streak: 0 days. Start your practice streak today!');
    }

    // Add weakest/strongest topic insights
    if (weakestTopic) {
      deterministicInsights.push(`Weakest topic: ${weakestTopic}. Focused unit practice recommended.`);
    }
    if (strongestTopic) {
      deterministicInsights.push(`Strongest topic: ${strongestTopic}. Solid mastery demonstrated.`);
    }

    // Add accuracy progression insight
    if (accuracyDeltaMessage) {
      deterministicInsights.push(accuracyDeltaMessage);
    }

    // 2. Cache Check: Check expiration (24 hours) or significant progress (newer sessional activity completion)
    const lastSessionCompleted = completedSessions[0];
    const lastSessionTime = lastSessionCompleted?.endedAt ? new Date(lastSessionCompleted.endedAt).getTime() : 0;
    const cacheTime = user.coachInsightsGeneratedAt ? new Date(user.coachInsightsGeneratedAt).getTime() : 0;
    
    const isCacheExpired = Date.now() - cacheTime > 24 * 60 * 60 * 1000;
    const hasNewProgress = lastSessionTime > cacheTime;

    // If cache is valid and no new progress, return cached insights
    if (
      user.coachInsights && 
      user.coachInsights.length > 0 && 
      !isCacheExpired && 
      !hasNewProgress
    ) {
      return NextResponse.json({ insights: user.coachInsights });
    }

    // 3. AI Insights synthesis or Rule-based fallback
    let insights: string[] = [];

    if (isAiEnabled()) {
      try {
        const stats = {
          streak: user.engagement?.streakCount || 0,
          totalXp: user.engagement?.totalXp || 0,
          sessionsCompleted: user.engagement?.sessionsCompleted || 0,
          incorrectCount: user.incorrectAttempts?.length || 0,
          weakestTopic: weakestTopic || 'None practicing yet',
          strongestTopic: strongestTopic || 'None practicing yet',
          progressMessage: accuracyDeltaMessage || 'No recent score history yet'
        };

        const prompt = `You are a strict, helpful university academic study coach. Analyze this student's performance statistics and generate 3 or 4 concise bulleted study observations (insights). 
Do NOT write any chat greetings, conversational filler, or introductory/concluding remarks. Output ONLY the list of bullet points.
Each bullet point should be active, direct, and under 15 words.

Student Stats:
- Study streak: ${stats.streak} days
- Sessional mock tests / practice sessions completed: ${stats.sessionsCompleted}
- Total XP: ${stats.totalXp}
- Questions with unresolved mistakes: ${stats.incorrectCount}
- Strongest topic: ${stats.strongestTopic}
- Weakest topic: ${stats.weakestTopic}
- Recent performance trend: ${stats.progressMessage}

Observations format:
* [Observation 1]
* [Observation 2]
* [Observation 3]
* [Observation 4]`;

        const completion = await groq!.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an academic coach returning concise bullet points.' },
            { role: 'user', content: prompt }
          ]
        });

        const content = completion.choices[0]?.message?.content || '';
        insights = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('*') || line.startsWith('-'))
          .map((line) => line.substring(1).trim());

      } catch (err) {
        console.error('Groq AI Coach request failed, falling back to deterministic insights:', err);
      }
    }

    // If AI failed or is disabled, we merge our deterministic insights as fallback
    if (insights.length === 0) {
      insights = [...deterministicInsights];
      if (insights.length === 0) {
        insights.push('Keep practicing! Try sessional Mock Tests to identify your weak curriculum areas.');
      }
    }

    // Save insights back to user profile as cache
    const dbUser = await User.findById(user._id);
    if (dbUser) {
      dbUser.coachInsights = insights;
      dbUser.coachInsightsGeneratedAt = new Date();
      await dbUser.save();
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('API Error in GET /api/users/coach:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
