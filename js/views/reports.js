/* ==========================================================================
   views/reports.js — Relatórios (somente Administrador): indicadores de
   produtividade e exportação em PDF e Excel.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  function summaryCardsHtml() {
    const overview = DB.Stats.overview();
    const perUser = DB.Stats.tasksPerUser();
    const totalTasks = perUser.reduce((s, u) => s + u.total, 0) || 1;
    const onTimeTotal = perUser.reduce((s, u) => s + u.onTime, 0);
    const avgHours = (perUser.reduce((s, u) => s + u.hours, 0) / (perUser.length || 1)).toFixed(1);
    const onTimePct = Math.round((onTimeTotal / totalTasks) * 100);

    const cards = [
      { label: "Produtividade geral", value: overview.productivity + "%", icon: "📈" },
      { label: "Entregas no prazo", value: onTimePct + "%", icon: "🎯" },
      { label: "Tempo médio por colaborador", value: avgHours + "h", icon: "⏱️" },
      { label: "Tarefas atrasadas", value: overview.overdue, icon: "⚠️" }
    ];

    return `<div class="stat-grid">${cards
      .map(
        (c) => `
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon" style="background:var(--color-primary-light); color:var(--color-primary);">${c.icon}</div></div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>`
      )
      .join("")}</div>`;
  }

  function tableHtml() {
    const perUser = DB.Stats.tasksPerUser();
    const rows = perUser
      .map((u) => {
        const pct = u.total ? Math.round((u.concluded / u.total) * 100) : 0;
        return `
        <tr>
          <td style="font-weight:700;">${UI.escapeHtml(u.name)}</td>
          <td>${u.total}</td>
          <td>${u.concluded}</td>
          <td>${u.onTime}</td>
          <td>${u.hours}h</td>
          <td>
            <div class="flex items-center gap-2">
              <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
              <span class="text-sm">${pct}%</span>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Tarefas por usuário</h3></div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Usuário</th><th>Total</th><th>Concluídas</th><th>No prazo</th><th>Horas</th><th>Produtividade</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function exportPdf() {
    if (!window.jspdf) {
      UI.toast("Biblioteca de PDF ainda não carregou. Verifique sua conexão.", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const overview = DB.Stats.overview();
    const perUser = DB.Stats.tasksPerUser();
    const settings = DB.Settings.get();

    doc.setFontSize(16);
    doc.text(settings.companyName || "Relatório de Produtividade", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Gerado em " + new Date().toLocaleString("pt-BR"), 14, 24);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Resumo geral", 14, 36);
    doc.setFontSize(10);
    doc.text(`Total de tarefas: ${overview.total}`, 14, 44);
    doc.text(`Concluídas: ${overview.concluded}`, 14, 50);
    doc.text(`Em andamento: ${overview.inProgress}`, 14, 56);
    doc.text(`Atrasadas: ${overview.overdue}`, 14, 62);
    doc.text(`Produtividade geral: ${overview.productivity}%`, 14, 68);

    doc.setFontSize(12);
    doc.text("Tarefas por usuário", 14, 80);
    doc.setFontSize(10);
    let y = 88;
    doc.text("Usuário", 14, y);
    doc.text("Total", 90, y);
    doc.text("Concl.", 110, y);
    doc.text("No prazo", 132, y);
    doc.text("Horas", 160, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    perUser.forEach((u) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(u.name).slice(0, 30), 14, y);
      doc.text(String(u.total), 90, y);
      doc.text(String(u.concluded), 110, y);
      doc.text(String(u.onTime), 132, y);
      doc.text(String(u.hours) + "h", 160, y);
      y += 7;
    });

    doc.save("relatorio_produtividade.pdf");
    UI.toast("Relatório PDF gerado com sucesso.", "success");
  }

  function exportExcel() {
    if (!window.XLSX) {
      UI.toast("Biblioteca de Excel ainda não carregou. Verifique sua conexão.", "error");
      return;
    }
    const perUser = DB.Stats.tasksPerUser();
    const overview = DB.Stats.overview();

    const wb = XLSX.utils.book_new();
    const resumo = [
      { Indicador: "Total de tarefas", Valor: overview.total },
      { Indicador: "Concluídas", Valor: overview.concluded },
      { Indicador: "Em andamento", Valor: overview.inProgress },
      { Indicador: "Atrasadas", Valor: overview.overdue },
      { Indicador: "Produtividade geral (%)", Valor: overview.productivity }
    ];
    const porUsuario = perUser.map((u) => ({
      Usuario: u.name,
      Total: u.total,
      Concluidas: u.concluded,
      NoPrazo: u.onTime,
      Horas: u.hours,
      ProdutividadePct: u.total ? Math.round((u.concluded / u.total) * 100) : 0
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porUsuario), "Por Usuario");
    XLSX.writeFile(wb, "relatorio_produtividade.xlsx");
    UI.toast("Relatório Excel gerado com sucesso.", "success");
  }

  function render(container, ctx) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Relatórios</h1>
          <p class="page-subtitle">Indicadores de produtividade, entregas e desempenho da equipe.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-export-pdf">📄 Exportar PDF</button>
          <button class="btn btn-secondary" id="btn-export-excel">📊 Exportar Excel</button>
        </div>
      </div>

      ${summaryCardsHtml()}
      ${tableHtml()}
    `;

    container.querySelector("#btn-export-pdf").addEventListener("click", exportPdf);
    container.querySelector("#btn-export-excel").addEventListener("click", exportExcel);
  }

  window.Views.reports = function (container, ctx) {
    render(container, ctx);
  };
})();
