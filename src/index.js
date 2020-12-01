/*
 * LightningChartJS example that showcases a simple XY line series.
 */
// Import LightningChartJS
const lcjs = require('@arction/lcjs')

// Extract required parts from LightningChartJS.
const {
    lightningChart,
    PalettedFill,
    LUT,
    ColorHSV,
    Themes
} = lcjs

const {
    createSpectrumDataGenerator
} = require('@arction/xydata')


// Length of single data sample.
const dataSampleSize = 300

// Length of data history.
const dataHistoryLength = 100


// Setup PalettedFill for dynamically coloring Heatmap by Intensity values.
const lut = new LUT( {
    steps: [
        { value: 0, color: ColorHSV(0, 1, 0) },
        { value: 100 * (1 / 6), color: ColorHSV(270, 0.84, 0.2) },
        { value: 100 * (2 / 6), color: ColorHSV(289, 0.86, 0.35) },
        { value: 100 * (3 / 6), color: ColorHSV(324, 0.97, 0.56) },
        { value: 100 * (4 / 6), color: ColorHSV(1, 1, 1) },
        { value: 100 * (5 / 6), color: ColorHSV(44, 0.64, 1) }
    ],
    interpolate: true
} )
const paletteFill = new PalettedFill( { lut, lookUpProperty: 'y' } )


// Create ChartXY.
const chartXY = lightningChart().ChartXY({
    // theme: Themes.dark
})
    .setTitle( 'Scrolling Heatmap Spectrogram' )
chartXY.getDefaultAxisX()
    .setTitle( 'Time' )
    // Set Axis range immediately to prevent initial animation for optimal performance.
    .setInterval( 0, dataHistoryLength )
chartXY.getDefaultAxisY()
    .setTitle( 'Frequency (Hz)' )
    // Set Axis range immediately to prevent initial animation for optimal performance.
    .setInterval( 0, dataSampleSize, false, true )


// Create Heatmap Series.
// pixelate: true adds one extra col+row to Grid, offset that here.
const columns = dataHistoryLength - 1
const rows = dataSampleSize - 1
const intensityOptions = {
    rows,
    columns,
    start: { x: dataHistoryLength, y: 0 },
    end: { x: 0, y: dataSampleSize },
    pixelate: true
}
const heatmapSeries = chartXY.addHeatmapSeries(intensityOptions)
    .setFillStyle( paletteFill )
    .setMouseInteractions( false )
    .setCursorEnabled( false )

// Stream in continous data.
createSpectrumDataGenerator()
    .setSampleSize( dataSampleSize )
    .setNumberOfSamples( dataHistoryLength )
    .generate()
    .setStreamRepeat( true )
    .setStreamInterval( 1000 / 60 )
    .setStreamBatchSize( 1 )
    .toStream()
    // Scale Intensity values from [0.0, 1.0] to [0.0, 80]
    .map( sample => sample.map( intensity => intensity * 80 ) )
    // Push Intensity values to Surface Grid as Columns.
    .forEach( sample => heatmapSeries.addColumn( 1, 'value', [sample] ) )
