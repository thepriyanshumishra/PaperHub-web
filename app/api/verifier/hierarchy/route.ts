import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Subject from '@/models/subject';
import Branch from '@/models/branch';
import Course from '@/models/course';
import College from '@/models/college';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await dbConnect();

    // 1. Fetch colleges, courses, branches, subjects
    const colleges = await College.find({}).lean();
    const courses = await Course.find({}).lean();
    const branches = await Branch.find({}).lean();
    const subjects = await Subject.find({}).lean();

    // 2. Fetch all question stats grouped by subjectId, year, examType, and status
    const stats = await Question.aggregate([
      { $unwind: "$sourcePapers" },
      {
        $group: {
          _id: {
            subjectId: "$subjectId",
            year: "$sourcePapers.year",
            examType: "$sourcePapers.examType",
            status: "$verificationStatus"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create maps for quick lookup
    const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
    const branchMap = new Map(branches.map(b => [b._id.toString(), b]));
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

    // Construct the nested tree
    const tree: Record<string, any> = {};

    for (const stat of stats) {
      const { subjectId, year, examType, status } = stat._id;
      const count = stat.count;

      const subject = subjectMap.get(subjectId.toString());
      if (!subject) continue;

      const semester = subject.semester;
      const cleanExamType = examType || 'Major';
      const cleanYear = year || 2025;

      for (const branchId of subject.branchIds) {
        const branch = branchMap.get(branchId.toString());
        if (!branch) continue;

        const course = courseMap.get(branch.courseId.toString());
        if (!course) continue;

        const college = colleges.find(c => c.universityId.toString() === course.universityId.toString());
        if (!college) continue;

        const collegeIdStr = college._id.toString();
        const courseIdStr = course._id.toString();
        const branchIdStr = branch._id.toString();

        // Initialize levels
        if (!tree[collegeIdStr]) {
          tree[collegeIdStr] = {
            collegeId: collegeIdStr,
            collegeName: college.name,
            collegeCode: college.code,
            pendingCount: 0,
            verifiedCount: 0,
            totalCount: 0,
            courses: {}
          };
        }

        const collegeNode = tree[collegeIdStr];

        if (!collegeNode.courses[courseIdStr]) {
          collegeNode.courses[courseIdStr] = {
            courseId: courseIdStr,
            courseName: course.name,
            courseCode: course.code,
            pendingCount: 0,
            verifiedCount: 0,
            totalCount: 0,
            branches: {}
          };
        }

        const courseNode = collegeNode.courses[courseIdStr];

        if (!courseNode.branches[branchIdStr]) {
          courseNode.branches[branchIdStr] = {
            branchId: branchIdStr,
            branchName: branch.name,
            branchCode: branch.code,
            pendingCount: 0,
            verifiedCount: 0,
            totalCount: 0,
            semesters: {}
          };
        }

        const branchNode = courseNode.branches[branchIdStr];

        if (!branchNode.semesters[semester]) {
          branchNode.semesters[semester] = {
            semester,
            pendingCount: 0,
            verifiedCount: 0,
            totalCount: 0,
            papers: {}
          };
        }

        const semesterNode = branchNode.semesters[semester];

        const paperKey = `${subject._id.toString()}-${cleanExamType}-${cleanYear}`;

        if (!semesterNode.papers[paperKey]) {
          semesterNode.papers[paperKey] = {
            subjectId: subject._id.toString(),
            subjectName: subject.name,
            subjectCode: subject.code,
            year: cleanYear,
            examType: cleanExamType,
            pendingCount: 0,
            verifiedCount: 0,
            totalCount: 0
          };
        }

        const paperNode = semesterNode.papers[paperKey];

        // Accumulate counts
        if (status === 'pending') {
          paperNode.pendingCount += count;
          semesterNode.pendingCount += count;
          branchNode.pendingCount += count;
          courseNode.pendingCount += count;
          collegeNode.pendingCount += count;
        } else if (status === 'verified') {
          paperNode.verifiedCount += count;
          semesterNode.verifiedCount += count;
          branchNode.verifiedCount += count;
          courseNode.verifiedCount += count;
          collegeNode.verifiedCount += count;
        }

        paperNode.totalCount += count;
        semesterNode.totalCount += count;
        branchNode.totalCount += count;
        courseNode.totalCount += count;
        collegeNode.totalCount += count;
      }
    }

    // Convert tree records to arrays and sort them
    const hierarchy = Object.values(tree).map((col: any) => {
      const coursesArr = Object.values(col.courses).map((crs: any) => {
        const branchesArr = Object.values(crs.branches).map((brn: any) => {
          const semestersArr = Object.values(brn.semesters).map((sem: any) => {
            const papersArr = Object.values(sem.papers);
            return {
              ...sem,
              papers: papersArr.sort((a: any, b: any) => a.subjectName.localeCompare(b.subjectName))
            };
          });
          return {
            ...brn,
            semesters: semestersArr.sort((a: any, b: any) => a.semester - b.semester)
          };
        });
        return {
          ...crs,
          branches: branchesArr.sort((a: any, b: any) => a.branchName.localeCompare(b.branchName))
        };
      });
      return {
        ...col,
        courses: coursesArr.sort((a: any, b: any) => a.courseName.localeCompare(b.courseName))
      };
    });

    return NextResponse.json({ hierarchy });
  } catch (error) {
    console.error('API Error in GET /api/verifier/hierarchy:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
