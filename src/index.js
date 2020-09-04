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
    ColorHEX,
    UIElementBuilders,
    UIOrigins,
    UIDraggingModes,
    Themes
} = lcjs

const {
    createProgressiveFunctionGenerator
} = require('@arction/xydata')

/**
 * Create data matrix for heatmap from one dimensional array
 * @param {Uint8Array}  data        FFT Data
 * @param {number}      strideSize  Single data block width
 * @param {number}      tickCount    Data row count
 */
const remapDataToTwoDimensionalMatrix = (data, strideSize, tickCount) => {
    /**
     * @type {Array<number>}
     */
    const arr = Array.from(data)

    // Map the one dimensional data to two dimensional data where data goes from right to left
    // [1, 2, 3, 4, 5, 6]
    // -> strideSize = 2
    // -> rowCount = 3
    // maps to
    // [1, 4]
    // [2, 5]
    // [3, 6]
    const output = Array.from(Array(strideSize)).map(() => Array.from(Array(tickCount)))
    for (let row = 0; row < strideSize; row += 1) {
        for (let col = 0; col <= tickCount; col += 1) {
            output[row][col] = arr[col * strideSize + row]
        }
    }

    return output
}

// Dimensions for the Heatmap. Also used to generate correct size array.
const resolution = 100
const historyLen = 500

// Create colorpalette for the LUT. The colors should interpolate between values.
const lut = new LUT({
    steps: [
        { value: 0, color: ColorHEX('#1000') },
        { value: 40, color: ColorHEX('#1000') },
        { value: 50, color: ColorHEX('#f00') }
    ],
    interpolate: true
})

const paletteFill = new PalettedFill({ lut })

// Create intensity grid
const chartXY = lightningChart().ChartXY({
    // theme: Themes.dark
})
const intensityOptions = {
    rows: resolution,
    columns: historyLen,
    start: { x: 0, y: 0 },
    end: { x: 100, y: 50 },
    pixelate: false
}
const grid = chartXY.addHeatmapSeries(intensityOptions)
    .setFillStyle(paletteFill)

// Index for sweeping mode.
let ind = 0

// Add a button to the top left of the chart to toggle between
// sweeping update and scrolling update for the intensity grid.
const toggleButton = chartXY.addUIElement(UIElementBuilders.CheckBox)
    .setText('Toggle sweeping on / off')
    .setOn(false)
    .setPosition({ x: 5, y: 99 })
    .setOrigin(UIOrigins.LeftTop)
    .setDraggingMode(UIDraggingModes.notDraggable)

toggleButton
    .onSwitch(() => {
        ind = 0
        grid.reset(intensityOptions)
    })

// Update the heatmap by sweeping the columns
const sweepColumns = (arr, ind) => {
    const remappedData = remapDataToTwoDimensionalMatrix(arr, resolution, 1)
    grid.invalidateValuesOnly(remappedData, { column: { start: ind, end: ind + 1 }, row: { start: 0, end: resolution - 1 } })
}

createProgressiveFunctionGenerator()
    .setSamplingFunction((x) => ((Math.sin(x)) * resolution) / 2)
    .setStep(0.01)
    .setStart(0)
    .setEnd(Math.PI * 2)
    .generate()
    .setStreamRepeat(true)
    .setStreamInterval(1000 / 60)
    .setStreamBatchSize(1)
    .toStream()
    .forEach((data) => {
        let values = []
        const y = data.y
        for (let i = 0; i < resolution; i++) {
            values[i] = Math.min(i - y, resolution - (i - y))
        }
        // State for the sweeping toggle.
        if (!toggleButton.getOn()) {
            grid.addColumn(1, 'value', [values])
        } else {
            // Sweeping mode. Add data to heatmap by invalidating values
            // with given data.
            sweepColumns(values, ind)
            ind += 1
            if (ind >= historyLen - 1)
                ind = 0
        }
    })
