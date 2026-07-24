import { parentPort, workerData } from 'node:worker_threads';

function trainSimpleModel(cases, epochs = 50) {
  const weights = [0.2, 0.3, 0.15, 0.1, 0.25];
  const bias = 0.1;
  const learningRate = 0.01;
  let totalLoss = 0;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    totalLoss = 0;
    for (const item of cases) {
      const features = [
        item.features[0] || 0,
        item.features[1] || 0,
        item.features[2] || 0,
        item.features[3] || 0,
        item.features[4] || 0,
      ];
      const prediction = features.reduce((sum, value, index) => sum + value * weights[index], bias);
      const error = item.label - Math.max(0, Math.min(1, prediction));
      totalLoss += error * error;
      features.forEach((value, index) => {
        weights[index] += learningRate * error * value;
      });
    }
  }

  const loss = totalLoss / cases.length;
  const accuracy = Math.max(0, Math.min(100, (1 - loss) * 100)).toFixed(2);
  return { weights, bias, loss: loss.toFixed(4), accuracy, epochs };
}

parentPort.postMessage(trainSimpleModel(workerData.cases, workerData.epochs || 50));
