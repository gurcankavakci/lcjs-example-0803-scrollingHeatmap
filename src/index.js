/*
 * LightningChartJS example that showcases simple usage of Scrolling Heatmap Grid Series.
 */
// Import LightningChartJS
const lcjs = require('@lightningchart/lcjs')

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

const { createSpectrumDataGenerator } = require('@lightningchart/xydata')

// Length of single data sample.
const dataSampleSize = 512
// Sampling rate as samples per second (only required for example purposes).
const sampleRateHz = 100
// Minimum time step that can be displayed by the heatmap. In this example, set to half of average interval between samples. In normal applications you can set this to some comfortably small value.
// Smaller value means more precision but more RAM and GPU memory usage.
const heatmapMinTimeStepMs = (0.5 * 1000) / sampleRateHz
// Time axis view at start
const viewMs = 10 * 1000

// Create ChartXY.
const chart = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .ChartXY({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    })
    .setTitle('Scrolling Heatmap Spectrogram')
chart
    .getDefaultAxisX()
    .setTitle('Time')
    // Setup progressive scrolling Axis.
    .setScrollStrategy(AxisScrollStrategies.progressive)
    .setDefaultInterval((state) => ({ end: state.dataMax, start: (state.dataMax ?? 0) - viewMs, stopAxisAfter: false }))
    .setTickStrategy(AxisTickStrategies.Time)

chart.getDefaultAxisY().setTitle('Frequency').setUnits('Hz').setInterval({ start: 0, end: dataSampleSize })

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
    })
    .setStart({ x: 0, y: 0 })
    .setStep({ x: heatmapMinTimeStepMs, y: 1 })
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

const handleIncomingData = (timestamp, sample) => {
    // Calculate sample index from timestamp to place sample in correct location in heatmap.
    const iSample = Math.round(timestamp / heatmapMinTimeStepMs)
    heatmapSeries.invalidateIntensityValues({
        iSample,
        values: [sample],
    })
}

// Generate and stream example data. The below code would not be needed in a real application, this is only for example purposes.
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
        let iData = 0
        let tPrev = window.performance.now()
        let dModulus = 0
        const streamData = () => {
            const tNow = window.performance.now()
            let addDataPointCount = ((tNow - tPrev) * sampleRateHz) / 1000 + dModulus
            dModulus = addDataPointCount % 1
            addDataPointCount = Math.floor(addDataPointCount)
            for (let i = 0; i < addDataPointCount; i += 1) {
                const timestamp = tPrev + ((i + 1) / addDataPointCount) * (tNow - tPrev)
                const sample = data[iData]
                iData = (iData + 1) % data.length
                handleIncomingData(timestamp, sample)
            }
            dataAmount += addDataPointCount * dataSampleSize
            tPrev = tNow
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
