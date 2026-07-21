import { chatbotEvalCases } from './cases.js';

const printEvalPlan = () => {
  console.log('Wheels&Deals chatbot eval plan');
  console.log(`Cases: ${chatbotEvalCases.length}`);
  for (const testCase of chatbotEvalCases) {
    console.log(`- ${testCase.id} [${testCase.category}]`);
    console.log(`  prompt: ${testCase.prompt}`);
    console.log(`  expected: ${testCase.expectedSignals.join(', ')}`);
    console.log(`  forbidden: ${testCase.forbiddenSignals.join(', ')}`);
  }
};

printEvalPlan();
