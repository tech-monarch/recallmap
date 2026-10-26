/** DEMONSTRATION CONTENT ONLY. Canned text written for the UI demo; not produced by any AI. */

export const DEMO_MATERIAL_TEXT: Record<string, { heading: string; body: string }[]> = {
  m1: [
    { heading: "Making decisions with conditions", body: "A condition is an expression that is either True or False. An if statement runs its block only when the condition is True. An else block runs when it is False.\n\nage = 17\nif age >= 18:\n    print(\"adult\")\nelse:\n    print(\"minor\")" },
    { heading: "Combining conditions", body: "Use and, or and not to build compound conditions. 'a and b' is True only when both are True. 'a or b' is True when at least one is True.\n\nif age >= 13 and age < 18:\n    print(\"teenager\")" },
    { heading: "Repeating work with loops", body: "A while loop repeats while its condition stays True. A for loop repeats once for each item in a sequence.\n\nfor n in [1, 2, 3]:\n    print(n * 2)" },
  ],
  m2: [
    { heading: "Notes: loops and conditions", body: "Loops depend on conditions: a while loop keeps going only while its condition is True, so the condition decides when the loop stops. If the condition never becomes False, the loop never ends." },
  ],
  m3: [
    { heading: "What is a function?", body: "A function assigns each input exactly one output. We write f(x) = 2x + 1 to mean: take x, double it, then add one. For example, f(3) = 7." },
  ],
};

export type TutorMode = "answer" | "simpler" | "steps" | "example" | "analogy";


type ConceptTutor = { overview: string; simpler: string; steps: string; example: string; analogy: string };
export const CONCEPT_TUTOR: Record<string, ConceptTutor> = {
  variables: {
    overview: "A variable is a name attached to a value so your program can use or change it later.",
    simpler: "A variable is a labelled box. The label is the name; what is inside is the value.",
    steps: "1. Pick a name. 2. Use = to give it a value. 3. Use the name later to read the value. 4. Assign again to change it.",
    example: "score = 10, then score = score + 5 leaves score holding 15.",
    analogy: "Think of a sticky note on a jar: you can swap what is in the jar without changing the note.",
  },
  booleans: {
    overview: "A boolean is either True or False. Comparisons such as age >= 18 produce booleans.",
    simpler: "A boolean is a yes/no answer the computer can check.",
    steps: "1. Write a comparison (like x > 3). 2. The computer evaluates it. 3. The result is True or False. 4. Combine results with and, or, not.",
    example: "x = 5; x > 3 gives True; x == 4 gives False.",
    analogy: "Like a light switch: it is on or off, nothing in between.",
  },
  conditions: {
    overview: "An if statement runs code only when its condition is True; else covers the other case. With compound conditions, both parts of 'and' must be True.",
    simpler: "If something is true, do this. Otherwise, do that.",
    steps: "1. Evaluate the condition to True or False. 2. If True, run the if block. 3. If False, skip it and run else (if present). 4. Continue after the whole statement.",
    example: "With age = 15, 'age >= 13 and age < 18' is True and True, so the whole condition is True.",
    analogy: "A fork in the road with a sign: the condition is the sign, and the program takes one path.",
  },
  loops: {
    overview: "A loop repeats a block of code. 'for' goes through each item; 'while' repeats as long as a condition holds.",
    simpler: "A loop does the same thing again and again until told to stop.",
    steps: "1. Check the loop condition or get the next item. 2. Run the block. 3. Return to step 1. 4. Stop when the condition is False or items run out.",
    example: "for n in [1, 2, 3]: print(n * 2) prints 2, 4, 6.",
    analogy: "Like laps around a track: keep running until you have done the number of laps, or until the whistle (the condition) says stop.",
  },
  functions: {
    overview: "A function is a named, reusable block of code that takes inputs and can return an output.",
    simpler: "A function is a mini-machine: put something in, get something out.",
    steps: "1. Define it with def and a name. 2. List its inputs (parameters). 3. Write the body. 4. Return a result. 5. Call it by name.",
    example: "def double(x): return x * 2, then double(4) gives 8.",
    analogy: "Like a recipe card: write it once, follow it whenever you need that dish.",
  },
};

export type PracticeQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  /** Shown only for a specific wrong option. Always presented as a POSSIBLE cause, never as established. */
  possibleCause?: Record<string, string>;
};

export const PRACTICE: PracticeQuestion[] = [
  {
    id: "q-cond-1", conceptId: "conditions",
    prompt: "age = 15. What does this print?\nif age >= 13 and age < 18:\n    print(\"teen\")\nelse:\n    print(\"other\")",
    options: [{ id: "a", text: "teen" }, { id: "b", text: "other" }, { id: "c", text: "Nothing is printed" }],
    correctId: "a",
    explanation: "Both parts of the 'and' are True (15 >= 13 and 15 < 18), so the if block runs.",
    possibleCause: { b: "One possible cause: treating 'and' like 'or' or only checking one side. This is a hypothesis, not a conclusion.", c: "One possible cause: thinking else is skipped when the if block is skipped." },
  },
  {
    id: "q-loop-1", conceptId: "loops",
    prompt: "What does this print?\nfor n in [1, 2, 3]:\n    print(n * 2)",
    options: [{ id: "a", text: "2 4 6" }, { id: "b", text: "1 2 3" }, { id: "c", text: "6" }],
    correctId: "a",
    explanation: "The loop runs once per item: 1*2, 2*2, 3*2 gives 2, 4, 6.",
    possibleCause: { c: "One possible cause: expecting a loop to print only the final result." },
  },
  {
    id: "q-var-1", conceptId: "variables",
    prompt: "score = 10\nscore = score + 5\nWhat is score now?",
    options: [{ id: "a", text: "10" }, { id: "b", text: "15" }, { id: "c", text: "5" }],
    correctId: "b",
    explanation: "The right side is evaluated first (10 + 5), then stored back into score.",
  },
];
