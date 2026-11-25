export function toCount(raw) {
  if (raw === '' || raw === null || raw === undefined) return null
  const value = Number(raw)
  return Number.isInteger(value) ? value : null
}

function countsOf(form) {
  return {
    checked: toCount(form.locationsChecked),
    ok: toCount(form.locationsOk),
    notOk: toCount(form.locationsNotOk),
  }
}

export function positionCheckError(form) {
  const { checked, ok, notOk } = countsOf(form)
  if (!form.checkDate) return 'Informe a data da conferência.'
  if (!form.operatorName) return 'Informe o responsável pela conferência.'
  if (checked === null || checked < 1) return 'Informe a quantidade de lugares verificados.'
  if (ok === null || ok < 0) return 'Informe a quantidade de lugares OK.'
  if (notOk === null || notOk < 0) return 'Informe a quantidade de lugares não OK.'
  if (ok + notOk !== checked) return `Lugares OK e não OK devem somar ${checked} lugares verificados.`
  if (notOk > 0 && !form.actionPlan) return 'Descreva o plano de ação para os lugares não OK.'
  return ''
}

export function positionCheckPayload(form, extra = {}) {
  const { checked, ok, notOk } = countsOf(form)
  return {
    ...extra,
    checkDate: form.checkDate,
    operatorName: form.operatorName,
    locationsChecked: checked,
    locationsOk: ok,
    locationsNotOk: notOk,
    occurrence: form.occurrence || null,
    actionPlan: form.actionPlan,
  }
}
