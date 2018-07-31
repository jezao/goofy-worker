import { processStepTimes } from "./elastic";

const result = processStepTimes({
  steps: {
    c: {
      time: "2018-06-11T19:43:43.456Z"
    },
    b: {
      time: "2018-06-11T19:43:43.455Z"
    },
    a: {
      time: "2018-06-11T19:43:42.455Z"
    }

  }
} as any);

console.log(JSON.stringify(result, null, 2));