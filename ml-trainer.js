const fs = require('fs');
const path = require('path');

// Simulated ML model trainer (using simple ML logic instead of TensorFlow to avoid heavy dependencies)
// In production, you'd use TensorFlow.js or a Python backend

class MLModelTrainer {
  constructor() {
    this.model = null;
    this.modelPath = path.join(__dirname, 'model.json');
    this.isTraining = false;
    this.trainingStats = {
      accuracy: 0,
      loss: 0,
      epochs: 0,
      samplesUsed: 0,
      lastTrained: null,
    };
    this.loadModel();
  }

  // Feature encoding functions
  encodeDistrict(district) {
    const districts = {
      'Bengaluru City': 0.95,
      'Bengaluru Urban': 0.9,
      'Tumakuru': 0.8,
      'Belagavi': 0.7,
      'Belagavi Dist': 0.75,
      'Mysuru Dist': 0.7,
      'Shivamogga': 0.65,
      'Dakshina Kannada': 0.6,
      'Hubballi-Dharwad': 0.6,
      'Kalaburagi': 0.6,
    };
    return districts[district] || 0.5;
  }

  encodeOffence(offence) {
    const offences = {
      'VEHICLE THEFT': 0.85,
      'THEFT': 0.85,
      'BURGLARY': 0.85,
      'ROBBERY': 0.8,
      'CHAIN SNATCHING': 0.75,
      'CYBER CRIME': 0.9,
      'CYBER FRAUD': 0.9,
      'NDPS': 0.95,
      'NARCOTIC': 0.95,
      'MURDER': 0.9,
      'RAPE': 0.9,
      'POCSO': 0.9,
    };
    const upperOffence = String(offence).toUpperCase();
    for (const [key, value] of Object.entries(offences)) {
      if (upperOffence.includes(key)) {
        return value;
      }
    }
    return 0.5;
  }

  encodeStatus(status) {
    const status_map = {
      'Open': 0.8,
      'In progress': 0.5,
      'Closed': 0.2,
    };
    return status_map[status] || 0.5;
  }

  riskToLabel(risk) {
    const risks = { 'High': 0.9, 'Medium': 0.5, 'Low': 0.1 };
    return risks[risk] || 0.5;
  }

  labelToRisk(label) {
    if (label > 0.7) return 'High';
    if (label > 0.3) return 'Medium';
    return 'Low';
  }

  // Prepare training data from cases
  prepareTrainingData(cases) {
    return cases.map((caseData) => ({
      features: [
        this.encodeDistrict(caseData.district),
        this.encodeOffence(caseData.offence),
        this.encodeStatus(caseData.status),
        caseData.suspect && caseData.suspect !== 'Unknown' ? 0.6 : 0.2,
        caseData.vehicle && caseData.vehicle !== 'N/A' ? 0.7 : 0.2,
      ],
      label: this.riskToLabel(caseData.risk),
      caseId: caseData.id,
    }));
  }

  // Simple neural network prediction
  predictRisk(features) {
    if (!this.model) {
      // Fallback: return based on feature importance
      const avgFeature = features.reduce((a, b) => a + b, 0) / features.length;
      return this.labelToRisk(avgFeature);
    }

    // Simple weighted sum (simulating neural network)
    const prediction =
      features[0] * this.model.weights[0] +
      features[1] * this.model.weights[1] +
      features[2] * this.model.weights[2] +
      features[3] * this.model.weights[3] +
      features[4] * this.model.weights[4] +
      this.model.bias;

    return this.labelToRisk(Math.max(0, Math.min(1, prediction)));
  }

  // Train model using simple gradient descent
  async trainModel(cases, epochs = 50) {
    if (this.isTraining) {
      return { error: 'Model is already training' };
    }

    this.isTraining = true;
    console.log(`[ML] Starting training with ${cases.length} cases...`);

    try {
      const trainingData = this.prepareTrainingData(cases);
      const samplesUsed = trainingData.length;

      // Initialize model weights
      this.model = {
        weights: [0.2, 0.3, 0.15, 0.1, 0.25],
        bias: 0.1,
      };

      let totalLoss = 0;
      const learningRate = 0.01;

      // Training loop
      for (let epoch = 0; epoch < epochs; epoch++) {
        totalLoss = 0;

        for (const data of trainingData) {
          // Forward pass
          let prediction =
            data.features[0] * this.model.weights[0] +
            data.features[1] * this.model.weights[1] +
            data.features[2] * this.model.weights[2] +
            data.features[3] * this.model.weights[3] +
            data.features[4] * this.model.weights[4] +
            this.model.bias;

          prediction = Math.max(0, Math.min(1, prediction));

          // Calculate loss
          const error = data.label - prediction;
          totalLoss += error * error;

          // Backward pass - update weights
          for (let i = 0; i < data.features.length; i++) {
            this.model.weights[i] += learningRate * error * data.features[i];
          }
          this.model.bias += learningRate * error;
        }

        totalLoss = totalLoss / trainingData.length;

        if ((epoch + 1) % 10 === 0) {
          console.log(`[ML] Epoch ${epoch + 1}/${epochs} - Loss: ${totalLoss.toFixed(4)}`);
        }
      }

      // Calculate accuracy
      let correct = 0;
      for (const data of trainingData) {
        const predicted = this.predictRisk(data.features);
        const actual = this.labelToRisk(data.label);
        if (predicted === actual) correct++;
      }
      const accuracy = (correct / trainingData.length) * 100;

      this.trainingStats = {
        accuracy: accuracy.toFixed(2),
        loss: totalLoss.toFixed(4),
        epochs: epochs,
        samplesUsed: samplesUsed,
        lastTrained: new Date().toISOString(),
      };

      // Save model to disk
      this.saveModel();

      console.log(`[ML] Training complete! Accuracy: ${accuracy.toFixed(2)}%`);

      this.isTraining = false;
      return {
        success: true,
        stats: this.trainingStats,
        message: `Model trained on ${samplesUsed} cases with ${accuracy.toFixed(2)}% accuracy`,
      };
    } catch (error) {
      this.isTraining = false;
      console.error('[ML] Training error:', error);
      return { error: error.message };
    }
  }

  // Save model to file
  saveModel() {
    try {
      const modelData = {
        model: this.model,
        stats: this.trainingStats,
        version: '1.0',
      };
      fs.writeFileSync(this.modelPath, JSON.stringify(modelData, null, 2));
      console.log('[ML] Model saved to', this.modelPath);
    } catch (error) {
      console.error('[ML] Failed to save model:', error.message);
    }
  }

  // Load model from file
  loadModel() {
    try {
      if (fs.existsSync(this.modelPath)) {
        const modelData = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
        this.model = modelData.model;
        this.trainingStats = modelData.stats;
        console.log('[ML] Model loaded from disk');
        return true;
      }
    } catch (error) {
      console.warn('[ML] Could not load model:', error.message);
    }
    return false;
  }

  // Get model info
  getModelInfo() {
    return {
      isTrained: !!this.model,
      isTraining: this.isTraining,
      stats: this.trainingStats,
    };
  }

  // Predict risk for a case (with confidence)
  predictCaseRisk(caseData) {
    const features = [
      this.encodeDistrict(caseData.district),
      this.encodeOffence(caseData.offence),
      this.encodeStatus(caseData.status),
      caseData.suspect && caseData.suspect !== 'Unknown' ? 0.6 : 0.2,
      caseData.vehicle && caseData.vehicle !== 'N/A' ? 0.7 : 0.2,
    ];

    const risk = this.predictRisk(features);

    // Calculate confidence (0-1)
    const rawPrediction =
      features[0] * (this.model?.weights[0] || 0.2) +
      features[1] * (this.model?.weights[1] || 0.3) +
      features[2] * (this.model?.weights[2] || 0.15) +
      features[3] * (this.model?.weights[3] || 0.1) +
      features[4] * (this.model?.weights[4] || 0.25) +
      (this.model?.bias || 0.1);

    const boundedScore = Math.min(1, Math.max(0, rawPrediction));
    const confidence = Math.abs(boundedScore - 0.5) * 2; // 0-1 scale

    return {
      predictedRisk: risk,
      riskScore: Number((boundedScore * 100).toFixed(1)),
      confidence: Math.min(1, Math.max(0, confidence)).toFixed(2),
      features: {
        district: features[0],
        offence: features[1],
        status: features[2],
        suspectKnown: features[3],
        vehicleKnown: features[4],
      },
    };
  }
}

module.exports = MLModelTrainer;
