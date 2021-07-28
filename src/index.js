/*
 * LightningChartJS example that showcases simple usage of Scrolling Heatmap Grid Series.
 */
// Import LightningChartJS
const lcjs = require("@arction/lcjs");

// Extract required parts from LightningChartJS.
const {
  lightningChart,
  PalettedFill,
  LUT,
  ColorHSV,
  emptyLine,
  AxisScrollStrategies,
  AxisTickStrategies,
  LegendBoxBuilders,
  Themes,
} = lcjs;

const { createSpectrumDataGenerator } = require("@arction/xydata");

// Length of single data sample.
const dataSampleSize = 300;

// Setup PalettedFill for dynamically coloring Heatmap by Intensity values.
const lut = new LUT({
  steps: [
    { value: 0, label: "0", color: ColorHSV(0, 1, 0) },
    { value: 15, label: "15", color: ColorHSV(270, 0.84, 0.2) },
    { value: 30, label: "30", color: ColorHSV(289, 0.86, 0.35) },
    { value: 45, label: "45", color: ColorHSV(324, 0.97, 0.56) },
    { value: 60, label: "60", color: ColorHSV(1, 1, 1) },
    { value: 75, label: "75", color: ColorHSV(44, 0.64, 1) },
  ],
  units: "dB",
  interpolate: true,
});
const paletteFill = new PalettedFill({ lut, lookUpProperty: "value" });

// Create ChartXY.
const chart = lightningChart()
  .ChartXY({
    // theme: Themes.darkGold
  })
  .setTitle("Scrolling Heatmap Spectrogram");
chart
  .getDefaultAxisX()
  .setTitle("Time")
  // Setup progressive scrolling Axis.
  .setScrollStrategy(AxisScrollStrategies.progressive)
  .setInterval(-10001, 0)
  .setTickStrategy(AxisTickStrategies.Time);
chart
  .getDefaultAxisY()
  .setTitle("Frequency (Hz)")
  .setInterval(0, dataSampleSize, false, true);

// Create Scrolling Heatmap Grid Series.
const heatmapSeries = chart
  .addHeatmapScrollingGridSeries({
    scrollDimension: "columns",
    resolution: dataSampleSize,
    start: { x: 0, y: 0 },
    // Heatmap X step is synced with incoming data interval (1 sample per 25 milliseconds).
    step: { x: 25, y: 1 },
  })
  .setFillStyle(paletteFill)
  .setWireframeStyle(emptyLine)
  .setMouseInteractions(false)
  // Configure automatic data cleaning.
  .setDataCleaning({
    // Out of view data can be lazily removed as long as total columns count remains over 1000.
    minDataPointCount: 1000,
  });

// Add LegendBox to chart.
const legend = chart
  .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
  // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
  .setAutoDispose({
      type: 'max-width',
      maxWidth: 0.80,
  })
  .add(chart)

// Stream in continous data.
let dataAmount = 0;
createSpectrumDataGenerator()
  .setSampleSize(dataSampleSize)
  .setNumberOfSamples(1000)
  .generate()
  .setStreamRepeat(true)
  .setStreamInterval(25)
  .setStreamBatchSize(1)
  .toStream()
  // Scale Intensity values from [0.0, 1.0] to [0.0, 80]
  .map((sample) => sample.map((intensity) => intensity * 80))
  // Push Intensity values to Surface Grid as Columns.
  .forEach((sample) => {
    heatmapSeries.addIntensityValues([sample]);
    dataAmount += sample.length;
  });

// Display incoming points amount in Chart title.
const title = chart.getTitle();
let tStart = Date.now();
let lastReset = Date.now();
const updateChartTitle = () => {
  // Calculate amount of incoming points / second.
  if (dataAmount > 0 && Date.now() - tStart > 0) {
    const pps = (1000 * dataAmount) / (Date.now() - tStart);
    chart.setTitle(`${title} (${Math.round(pps)} data points / s)`);
  }
  // Reset pps counter every once in a while in case page is frozen, etc.
  if (Date.now() - lastReset >= 5000) {
    tStart = lastReset = Date.now();
    dataAmount = 0;
  }
};
setInterval(updateChartTitle, 1000);
