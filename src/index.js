/*
 * LightningChartJS example that showcases simple usage of Scrolling Heatmap Grid Series.
 */
// Import LightningChartJS
const lcjs = require('@arction/lcjs')

// Extract required parts from LightningChartJS.
const {
    lightningChart,
    PalettedFill,
    LUT,
    emptyLine,
    AxisScrollStrategies,
    AxisTickStrategies,
    LegendBoxBuilders,
    regularColorSteps,
    Themes,
} = lcjs

const { createSpectrumDataGenerator } = require('@arction/xydata')

// Length of single data sample.
const dataSampleSize = 512
// Sampling rate as samples per second.
const sampleRateHz = 100
const sampleIntervalMs = 1000 / sampleRateHz

// Create ChartXY.
const chart = lightningChart()
    .ChartXY({
        // theme: Themes.darkGold
    })
    .setTitle('Scrolling Heatmap Spectrogram')
chart
    .getDefaultAxisX()
    .setTitle('Time')
    // Setup progressive scrolling Axis.
    .setScrollStrategy(AxisScrollStrategies.progressive)
    .setInterval({ start: -10 * 1000, end: 0, stopAxisAfter: false })
    .setTickStrategy(AxisTickStrategies.Time)

chart.getDefaultAxisY().setTitle('Frequency (Hz)').setInterval({ start: 0, end: dataSampleSize })

const theme = chart.getTheme()
// Setup PalettedFill for dynamically coloring Heatmap by Intensity values.
const lut = new LUT({
    steps: regularColorSteps(0, 75, theme.examples.spectrogramColorPalette),
    units: 'dB',
    interpolate: true,
})
const paletteFill = new PalettedFill({ lut, lookUpProperty: 'value' })

// Create Scrolling Heatmap Grid Series.
const heatmapSeries = chart
    .addHeatmapScrollingGridSeries({
        scrollDimension: 'columns',
        resolution: dataSampleSize,
        start: { x: 0, y: 0 },
        step: { x: sampleIntervalMs, y: 1 },
    })
    .setFillStyle(paletteFill)
    .setWireframeStyle(emptyLine)
    // Configure automatic data cleaning.
    .setDataCleaning({
        // Out of view data can be lazily removed as long as total columns count remains over 1000.
        minDataPointCount: 1000,
    })

// Add LegendBox to chart.
const legend = chart
    .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
    // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
    .setAutoDispose({
        type: 'max-width',
        maxWidth: 0.8,
    })
    .add(chart)

// Generate and stream example data.
let dataAmount = 0
createSpectrumDataGenerator()
    .setSampleSize(dataSampleSize)
    .setNumberOfSamples(1000)
    .generate()
    .toPromise()
    .then((data) => {
        // Scale Intensity values from [0.0, 1.0] to [0.0, 80]
        return data.map((sample) => sample.map((intensity) => intensity * 80))
    })
    .then((data) => {
        // Stream data into series.
        let tStart = window.performance.now()
        let pushedDataCount = 0
        const streamData = () => {
            const tNow = window.performance.now()
            // NOTE: This code is for example purposes (streaming stable data rate without destroying browser when switching tabs etc.)
            // In real use cases, data should be pushed in when it comes.
            const shouldBeDataPointsCount = Math.floor((sampleRateHz * (tNow - tStart)) / 1000)
            const newDataPointsCount = Math.min(shouldBeDataPointsCount - pushedDataCount, 100) // Add max 100 samples per frame into a series. This prevents massive performance spikes when switching tabs for long times
            if (newDataPointsCount > 0) {
                const newDataPoints = []
                for (let iDp = 0; iDp < newDataPointsCount; iDp++) {
                    const iData = (pushedDataCount + iDp) % data.length
                    const sample = data[iData]
                    newDataPoints.push(sample)
                }
                heatmapSeries.addIntensityValues(newDataPoints)
                pushedDataCount += newDataPointsCount
                dataAmount += newDataPointsCount * dataSampleSize
            }
            requestAnimationFrame(streamData)
        }
        streamData()
    })

// Display incoming points amount in Chart title.
const title = chart.getTitle()
let tStart = Date.now()
let lastReset = Date.now()
const updateChartTitle = () => {
    // Calculate amount of incoming points / second.
    if (dataAmount > 0 && Date.now() - tStart > 0) {
        const pps = (1000 * dataAmount) / (Date.now() - tStart)
        chart.setTitle(`${title} (${Math.round(pps)} data points / s)`)
    }
    // Reset pps counter every once in a while in case page is frozen, etc.
    if (Date.now() - lastReset >= 5000) {
        tStart = lastReset = Date.now()
        dataAmount = 0
    }
}
setInterval(updateChartTitle, 1000)
