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

export const seedColleges: SeedCollege[] = [
  {
    name: "Madan Mohan Malaviya University of Technology",
    code: "MMMUT",
    isActive: true,
    branches: [
      {
        name: "Computer Science & Engineering",
        code: "CSE",
        isActive: true,
        subjects: [
          {
            name: "Engineering Mathematics-I",
            code: "BAS-01",
            semester: 1,
            syllabus: [
              {
                unitNumber: 1,
                unitTitle: "Differential Calculus-I",
                topics: ["Successive Differentiation", "Leibnitz Theorem", "Partial Differentiation", "Euler's Theorem"]
              },
              {
                unitNumber: 2,
                unitTitle: "Differential Calculus-II",
                topics: ["Asymptotes", "Curve Tracing", "Taylor's and Maclaurin's Theorems", "Maxima and Minima"]
              },
              {
                unitNumber: 3,
                unitTitle: "Multivariable Calculus",
                topics: ["Jacobians", "Beta and Gamma Functions", "Multiple Integrals", "Dirichlet's Integral"]
              },
              {
                unitNumber: 4,
                unitTitle: "Vector Calculus",
                topics: ["Gradient, Divergence and Curl", "Line, Surface and Volume Integrals", "Green's Theorem", "Gauss Divergence Theorem", "Stokes' Theorem"]
              },
              {
                unitNumber: 5,
                unitTitle: "Matrices",
                topics: ["Rank of a Matrix", "Eigenvalues and Eigenvectors", "Cayley-Hamilton Theorem", "Diagonalization of Matrices"]
              }
            ]
          },
          {
            name: "Computer Concepts & Programming in C",
            code: "BCS-01",
            semester: 1,
            syllabus: [
              {
                unitNumber: 1,
                unitTitle: "Introduction to Computer & Programming Basics",
                topics: ["Computer Organization", "Algorithm and Flowcharts", "Number Systems", "Compilation and Linking"]
              },
              {
                unitNumber: 2,
                unitTitle: "Basics of C",
                topics: ["Data Types", "Operators and Expressions", "Input and Output", "Control Statements (if-else, switch)"]
              },
              {
                unitNumber: 3,
                unitTitle: "Arrays and Strings",
                topics: ["One-Dimensional Arrays", "Multi-Dimensional Arrays", "String Operations", "Null Terminator"]
              },
              {
                unitNumber: 4,
                unitTitle: "Functions and Pointers",
                topics: ["Function Declarations and Definitions", "Call by Value vs Call by Reference", "Recursion", "Pointer Basics", "Pointer Arithmetic"]
              },
              {
                unitNumber: 5,
                unitTitle: "Structures, Unions & Files",
                topics: ["Structure Declaration", "Union", "Nested Structures", "File Handling (fopen, fclose)"]
              }
            ]
          }
        ]
      },
      {
        name: "Information Technology",
        code: "IT",
        isActive: true,
        subjects: [
          {
            name: "Engineering Mathematics-I",
            code: "BAS-01",
            semester: 1,
            syllabus: [
              {
                unitNumber: 1,
                unitTitle: "Differential Calculus-I",
                topics: ["Successive Differentiation", "Leibnitz Theorem", "Partial Differentiation", "Euler's Theorem"]
              }
            ]
          }
        ]
      },
      {
        name: "Electronics & Communication Engineering",
        code: "ECE",
        isActive: false,
        subjects: []
      }
    ]
  },
  {
    name: "Dr. A.P.J. Abdul Kalam Technical University",
    code: "AKTU",
    isActive: false,
    branches: []
  },
  {
    name: "Harcourt Butler Technical University",
    code: "HBTU",
    isActive: false,
    branches: []
  }
];

export const seedQuestions: SeedQuestion[] = [
  // BAS-01 Questions
  {
    subjectCode: "BAS-01",
    unit: 1,
    topic: "Leibnitz Theorem",
    questionText: "If $y = e^{a \\sin^{-1} x}$, show that $(1-x^2)y_{n+2} - (2n+1)xy_{n+1} - (n^2+a^2)y_n = 0$.",
    difficulty: "hard",
    repetitionFrequency: 4,
    sourcePapers: [
      { year: 2022, examType: "Major" },
      { year: 2023, examType: "Major" },
      { year: 2024, examType: "Minor 2" }
    ],
    cachedSolution: {
      content: "To prove: $(1-x^2)y_{n+2} - (2n+1)xy_{n+1} - (n^2+a^2)y_n = 0$ given $y = e^{a \\sin^{-1} x}$.\n\nWe will find the first and second derivatives and then apply Leibnitz's Theorem for $n$-th differentiation of a product.",
      steps: [
        {
          stepNumber: 1,
          heading: "First Differentiation",
          content: "Given $y = e^{a \\sin^{-1} x}$.\nDifferentiating with respect to $x$:\n$$y_1 = y' = e^{a \\sin^{-1} x} \\cdot \\frac{a}{\\sqrt{1-x^2}}$$\n$$y_1 = \\frac{ay}{\\sqrt{1-x^2}}$$\nSquaring both sides and cross-multiplying:\n$$(1-x^2)y_1^2 = a^2 y^2$$"
        },
        {
          stepNumber: 2,
          heading: "Second Differentiation",
          content: "Differentiating $(1-x^2)y_1^2 = a^2 y^2$ again with respect to $x$:\n$$(1-x^2) \\cdot 2y_1 y_2 + (-2x) y_1^2 = a^2 \\cdot 2y y_1$$\nDividing both sides by $2y_1$ (since $y_1 \\neq 0$):\n$$(1-x^2)y_2 - xy_1 = a^2 y$$\nRearranging:\n$$(1-x^2)y_2 - xy_1 - a^2 y = 0$$"
        },
        {
          stepNumber: 3,
          heading: "Apply Leibnitz's Theorem",
          content: "Leibnitz's Theorem states that:\n$$(uv)_n = u_n v + ^nC_1 u_{n-1} v_1 + ^nC_2 u_{n-2} v_2 + \\dots + u v_n$$\nDifferentiating each term of $(1-x^2)y_2 - xy_1 - a^2 y = 0$ $n$ times:\n\n**Term 1:** $D^n[(1-x^2)y_2]$\nLet $u = y_2$ (so $u_n = y_{n+2}$) and $v = 1-x^2$ (so $v_1 = -2x$, $v_2 = -2$, $v_3 = 0$):\n$$D^n[y_2(1-x^2)] = y_{n+2}(1-x^2) + n y_{n+1}(-2x) + \\frac{n(n-1)}{2} y_n(-2)$$\n$$= (1-x^2)y_{n+2} - 2nxy_{n+1} - n(n-1)y_n$$\n\n**Term 2:** $D^n[xy_1]$\nLet $u = y_1$ ($u_n = y_{n+1}$) and $v = x$ ($v_1 = 1$, $v_2 = 0$):\n$$D^n[y_1 x] = y_{n+1}x + n y_n(1) = xy_{n+1} + ny_n$$\n\n**Term 3:** $D^n[a^2 y] = a^2 y_n$\n\nSubstituting these values back into the differentiated equation:\n$$\\left[ (1-x^2)y_{n+2} - 2nxy_{n+1} - n(n-1)y_n \\right] - \\left[ xy_{n+1} + ny_n \\right] - a^2 y_n = 0$$\n$$(1-x^2)y_{n+2} - (2n+1)xy_{n+1} - (n(n-1) + n + a^2)y_n = 0$$\n$$(1-x^2)y_{n+2} - (2n+1)xy_{n+1} - (n^2 - n + n + a^2)y_n = 0$$\n$$(1-x^2)y_{n+2} - (2n+1)xy_{n+1} - (n^2 + a^2)y_n = 0$$\nThis completes the proof."
        }
      ]
    }
  },
  {
    subjectCode: "BAS-01",
    unit: 1,
    topic: "Euler's Theorem",
    questionText: "If $u = \\sin^{-1}\\left( \\frac{x^2 + y^2}{x + y} \\right)$, prove that $x\\frac{\\partial u}{\\partial x} + y\\frac{\\partial u}{\\partial y} = \\tan u$.",
    difficulty: "medium",
    repetitionFrequency: 3,
    sourcePapers: [
      { year: 2020, examType: "Major" },
      { year: 2023, examType: "Minor 1" }
    ]
  },
  {
    subjectCode: "BAS-01",
    unit: 2,
    topic: "Taylor's and Maclaurin's Theorems",
    questionText: "Expand $\\log(1 + e^x)$ in powers of $x$ up to the term containing $x^4$ using Maclaurin's theorem.",
    difficulty: "medium",
    repetitionFrequency: 2,
    sourcePapers: [
      { year: 2021, examType: "Major" },
      { year: 2024, examType: "Major" }
    ]
  },
  {
    subjectCode: "BAS-01",
    unit: 5,
    topic: "Cayley-Hamilton Theorem",
    questionText: "State Cayley-Hamilton Theorem. Verify it for the matrix $A = \\begin{bmatrix} 2 & -1 & 1 \\\\ -1 & 2 & -1 \\\\ 1 & -1 & 2 \\end{bmatrix}$ and hence find $A^{-1}$.",
    difficulty: "hard",
    repetitionFrequency: 5,
    sourcePapers: [
      { year: 2019, examType: "Major" },
      { year: 2022, examType: "Major" },
      { year: 2024, examType: "Major" }
    ]
  },

  // BCS-01 Questions
  {
    subjectCode: "BCS-01",
    unit: 2,
    topic: "Control Statements (if-else, switch)",
    questionText: "Write a complete C program to find the roots of a quadratic equation $ax^2 + bx + c = 0$ using if-else statements to handle real, equal, and imaginary roots.",
    difficulty: "easy",
    repetitionFrequency: 4,
    sourcePapers: [
      { year: 2021, examType: "Minor 1" },
      { year: 2023, examType: "Major" }
    ],
    cachedSolution: {
      content: "A quadratic equation is given by $ax^2 + bx + c = 0$. The roots depend on the discriminant $D = b^2 - 4ac$. We write a program to check the value of $D$ and compute roots accordingly.",
      steps: [
        {
          stepNumber: 1,
          heading: "Logic Formulation",
          content: "Let $D = b^2 - 4ac$ be the discriminant.\n- If $D > 0$, the roots are real and distinct: $r_1, r_2 = \\frac{-b \\pm \\sqrt{D}}{2a}$.\n- If $D = 0$, the roots are real and equal: $r_1 = r_2 = \\frac{-b}{2a}$.\n- If $D < 0$, the roots are complex/imaginary: $r_{real} = \\frac{-b}{2a}$, $r_{img} = \\frac{\\sqrt{-D}}{2a}$."
        },
        {
          stepNumber: 2,
          heading: "Writing the Code",
          content: "Here is the complete C program:\n\n```c\n#include <stdio.h>\n#include <math.h>\n\nint main() {\n    double a, b, c, discriminant, root1, root2, realPart, imagPart;\n    printf(\"Enter coefficients a, b and c: \");\n    scanf(\"%lf %lf %lf\", &a, &b, &c);\n\n    discriminant = b * b - 4 * a * c;\n\n    // condition for real and distinct roots\n    if (discriminant > 0) {\n        root1 = (-b + sqrt(discriminant)) / (2 * a);\n        root2 = (-b - sqrt(discriminant)) / (2 * a);\n        printf(\"root1 = %.2lf and root2 = %.2lf\\n\", root1, root2);\n    }\n    // condition for real and equal roots\n    else if (discriminant == 0) {\n        root1 = root2 = -b / (2 * a);\n        printf(\"root1 = root2 = %.2lf;\\n\", root1);\n    }\n    // if roots are not real\n    else {\n        realPart = -b / (2 * a);\n        imagPart = sqrt(-discriminant) / (2 * a);\n        printf(\"root1 = %.2lf+%.2lfi and root2 = %.2lf-%.2lfi\\n\", realPart, imagPart, realPart, imagPart);\n    }\n\n    return 0;\n}\n```"
        }
      ]
    }
  },
  {
    subjectCode: "BCS-01",
    unit: 4,
    topic: "Recursion",
    questionText: "Write a recursive C function to solve the Tower of Hanoi problem for $n$ disks. Draw the recursion tree for $n=3$ disks.",
    difficulty: "hard",
    repetitionFrequency: 3,
    sourcePapers: [
      { year: 2020, examType: "Major" },
      { year: 2022, examType: "Major" }
    ]
  },
  {
    subjectCode: "BCS-01",
    unit: 4,
    topic: "Call by Value vs Call by Reference",
    questionText: "Explain the difference between Call by Value and Call by Reference with suitable C code examples. How are pointers used to implement Call by Reference in C?",
    difficulty: "medium",
    repetitionFrequency: 5,
    sourcePapers: [
      { year: 2021, examType: "Major" },
      { year: 2023, examType: "Minor 2" },
      { year: 2024, examType: "Major" }
    ]
  }
];
