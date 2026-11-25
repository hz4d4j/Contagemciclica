export const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart, _args, options) {
    if (!options?.format) return
    const { ctx } = chart
    ctx.save()
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.fillStyle = options.color
    ctx.textAlign = 'center'
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (!chart.isDatasetVisible(datasetIndex)) return
      chart.getDatasetMeta(datasetIndex).data.forEach((element, index) => {
        const value = dataset.data[index]
        if (value === null || value === undefined) return
        if (value === 0 && chart.config.type === 'doughnut') return
        const text = options.format(value, datasetIndex, index)
        if (chart.config.type === 'doughnut') {
          const center = element.getCenterPoint()
          ctx.textBaseline = 'middle'
          ctx.fillText(text, center.x, center.y)
        } else if (chart.config.type === 'bar') {
          ctx.textBaseline = value >= 0 ? 'bottom' : 'top'
          ctx.fillText(text, element.x, value >= 0 ? element.y - 4 : element.y + 4)
        } else {
          ctx.textBaseline = 'bottom'
          ctx.fillText(text, element.x, element.y - 8)
        }
      })
    })
    ctx.restore()
  },
}
