export interface SeedUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

export interface SeedSubject {
  name: string;
  code: string;
  semester: number;
  syllabus: SeedUnit[];
}

export interface SeedBranch {
  name: string;
  code: string;
  isActive: boolean;
  subjects: SeedSubject[];
}

export interface SeedCollege {
  name: string;
  code: string;
  isActive: boolean;
  branches: SeedBranch[];
}

export interface SeedQuestion {
  subjectCode: string;
  unit: number;
  topic: string;
  questionText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  repetitionFrequency: number;
  sourcePapers: { year: number; examType: string }[];
  cachedSolution?: {
    content: string;
    steps: { stepNumber: number; heading: string; content: string }[];
  };
}

export const seedColleges: SeedCollege[] = [];
export const seedQuestions: SeedQuestion[] = [];
