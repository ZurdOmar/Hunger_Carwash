export interface PrintCorteData {
  turno: {
    fecha_apertura: string | null
    fecha_cierre: string | null
    monto_inicial: number
    monto_sistema: number | null
    monto_declarado: number | null
    diferencia: number | null
    ajuste_monto?: number | null
    ajuste_nota?: string | null
    estado: string | null
  }
  cajeroNombre: string
  cashTotal: number
  cardTotal: number
  memberTotal: number
  totalHoy: number
  autosHoy: number
  orders?: { folio: string | number; placa: string; total: number; metodo: string }[]
}

export function imprimirCorte(data: PrintCorteData): void {
  const { turno, cajeroNombre, cashTotal, cardTotal, memberTotal, totalHoy, autosHoy, orders } = data
  const dif = turno.diferencia ?? 0
  const difSign = dif > 0 ? '+' : ''
  const difColor = dif === 0 ? 'green' : dif > 0 ? 'darkorange' : 'crimson'

  const fmtN = (n: number) => `$${n.toLocaleString()}`
  const fmtD = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('es-MX') : '—'

  const ordersRows =
    orders && orders.length > 0
      ? orders
          .map(
            (o) =>
              `<tr><td>#${o.folio}</td><td>${o.placa || '—'}</td><td>${o.metodo || '—'}</td><td class="r">${fmtN(o.total)}</td></tr>`
          )
          .join('')
      : ''

  const ordersSection = ordersRows
    ? `<div class="div"></div>
       <p class="lbl">Órdenes del turno</p>
       <table>
         <thead><tr><th>Folio</th><th>Placa</th><th>Método</th><th class="r">Total</th></tr></thead>
         <tbody>${ordersRows}</tbody>
       </table>`
    : ''

  const ajusteSection =
    turno.ajuste_monto && Number(turno.ajuste_monto) !== 0
      ? `<div class="row"><span>Ajuste</span><span>${Number(turno.ajuste_monto) > 0 ? '+' : ''}${fmtN(Number(turno.ajuste_monto))}</span></div>
         ${turno.ajuste_nota ? `<p class="note">Nota: ${turno.ajuste_nota}</p>` : ''}`
      : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Corte de Caja — Hunger Car Wash</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;max-width:80mm;margin:0 auto;padding:6mm 4mm}
    .c{text-align:center}
    h1{font-size:15px;letter-spacing:2px;text-transform:uppercase}
    h2{font-size:11px;font-weight:normal;letter-spacing:1px;margin-top:2px}
    .sub{font-size:10px;color:#555;margin-top:4px}
    .div{border-top:1px dashed #000;margin:7px 0}
    .div2{border-top:2px solid #000;margin:7px 0}
    .lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#333;margin-bottom:3px}
    .row{display:flex;justify-content:space-between;margin:3px 0;font-size:12px}
    .big{font-size:14px;font-weight:bold;margin-top:5px}
    .dif{font-size:13px;font-weight:bold;color:${difColor}}
    .note{font-size:10px;color:#555;font-style:italic;margin:2px 0 4px 8px}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-top:4px}
    th{text-align:left;font-size:9px;text-transform:uppercase;padding:2px 0;border-bottom:1px solid #ccc}
    td{padding:2px 0}
    .r{text-align:right}
    .footer{text-align:center;font-size:9px;color:#777;margin-top:10px;letter-spacing:1px}
    @media print{body{max-width:100%}}
  </style>
</head>
<body>
  <div class="c">
    <h1>Hunger Car Wash</h1>
    <h2>Corte de Caja</h2>
    <p class="sub">Impreso: ${new Date().toLocaleString('es-MX')}</p>
  </div>
  <div class="div2"></div>
  <div class="row"><span>Cajero</span><strong>${cajeroNombre}</strong></div>
  <div class="row"><span>Apertura</span><span>${fmtD(turno.fecha_apertura)}</span></div>
  <div class="row"><span>Cierre</span><span>${fmtD(turno.fecha_cierre)}</span></div>
  <div class="row"><span>Órdenes</span><span>${autosHoy}</span></div>
  <div class="div"></div>
  <p class="lbl">Desglose</p>
  <div class="row"><span>Efectivo</span><span>${fmtN(cashTotal)}</span></div>
  <div class="row"><span>Tarjeta</span><span>${fmtN(cardTotal)}</span></div>
  <div class="row"><span>Membresía</span><span>${fmtN(memberTotal)}</span></div>
  <div class="row big"><span>Total recaudado</span><span>${fmtN(totalHoy)}</span></div>
  <div class="div"></div>
  <p class="lbl">Cuadre de caja</p>
  <div class="row"><span>Monto inicial</span><span>${fmtN(turno.monto_inicial)}</span></div>
  <div class="row"><span>Sistema (efectivo)</span><span>${fmtN(turno.monto_sistema ?? 0)}</span></div>
  <div class="row"><span>Declarado</span><span>${fmtN(turno.monto_declarado ?? 0)}</span></div>
  ${ajusteSection}
  <div class="row dif"><span>Diferencia</span><span>${difSign}${fmtN(dif)}</span></div>
  ${ordersSection}
  <div class="div2"></div>
  <div class="footer">HUNGER CAR WASH • SISTEMA ERP<br>Documento generado automáticamente</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=420,height=720,scrollbars=yes')
  if (!win) {
    alert('Permite ventanas emergentes en el navegador para imprimir')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
