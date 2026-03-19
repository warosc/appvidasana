import { Controller, Get, Query, Res } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { Response } from "express";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("inventory")
  inventory(@Query("productId") productId?: string, @Query("warehouseId") warehouseId?: string) {
    return this.reportsService.inventory({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
    });
  }

  @Get("movements")
  movements(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("type") type?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.reportsService.movements({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      type,
      from,
      to,
    });
  }

  @Get("waste")
  waste(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("reason") reason?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.reportsService.waste({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      reason,
      from,
      to,
    });
  }

  @Get("purchases")
  purchases(
    @Query("status") status?: string,
    @Query("supplierId") supplierId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.reportsService.purchases({
      status,
      supplierId: supplierId ? Number(supplierId) : undefined,
      from,
      to,
    });
  }

  @Get("sales")
  sales(
    @Query("status") status?: string,
    @Query("customerId") customerId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.reportsService.sales({
      status,
      customerId: customerId ? Number(customerId) : undefined,
      from,
      to,
    });
  }

  @Get("export")
  async export(
    @Query("type") type: string,
    @Query("format") format: string,
    @Query("currencyCode") currencyCode: string | undefined,
    @Query("currencySymbol") currencySymbol: string | undefined,
    @Query("companyName") companyName: string | undefined,
    @Query("reportSubtitle") reportSubtitle: string | undefined,
    @Query("productId") productId: string | undefined,
    @Query("warehouseId") warehouseId: string | undefined,
    @Query("movementType") movementType: string | undefined,
    @Query("reason") reason: string | undefined,
    @Query("status") status: string | undefined,
    @Query("supplierId") supplierId: string | undefined,
    @Query("customerId") customerId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res() res: Response
  ) {
    const data = await this.reportsService.getReportData(type, {
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      type: movementType,
      reason,
      status,
      supplierId: supplierId ? Number(supplierId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      from,
      to,
    });

    const columns = this.getColumns(type);

    if (format === "csv") {
      const csv = this.toCsv(columns, data as Record<string, unknown>[]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}-report.csv`
      );
      return res.send(csv);
    }

    if (format === "xlsx") {
      const workbook = await this.toXlsx(
        type,
        columns,
        data as Record<string, unknown>[],
        {
          productId,
          warehouseId,
          movementType,
          reason,
          status,
          supplierId,
          customerId,
          from,
          to,
        }
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}-report.xlsx`
      );
      return res.send(workbook);
    }

    const logoPath = this.resolveLogoPath();
    const pdf = await this.toPdf(
      type,
      columns,
      data as Record<string, unknown>[],
      logoPath,
      {
        currencyCode,
        currencySymbol,
        companyName,
        reportSubtitle,
      },
      {
        productId,
        warehouseId,
        movementType,
        reason,
        status,
        supplierId,
        customerId,
        from,
        to,
      }
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${type}-report.pdf`
    );
    return res.send(pdf);
  }

  private getReportTitle(type: string) {
    switch (type) {
      case "inventory":
        return "Inventario";
      case "movements":
        return "Movimientos";
      case "waste":
        return "Merma";
      case "purchases":
        return "Compras";
      case "sales":
        return "Ventas";
      default:
        return "Reporte";
    }
  }

  private getColumns(type: string) {
    switch (type) {
      case "inventory":
        return [
          { key: "productCode", label: "Codigo" },
          { key: "productName", label: "Producto" },
          { key: "warehouseCode", label: "Bodega" },
          { key: "stock", label: "Stock" },
          { key: "baseUnit", label: "Unidad" },
        ];
      case "movements":
        return [
          { key: "id", label: "ID" },
          { key: "productName", label: "Producto" },
          { key: "warehouseCode", label: "Bodega" },
          { key: "movementType", label: "Tipo" },
          { key: "quantity", label: "Cantidad" },
          { key: "unit", label: "Unidad" },
          { key: "createdAt", label: "Fecha" },
        ];
      case "waste":
        return [
          { key: "productName", label: "Producto" },
          { key: "warehouseCode", label: "Bodega" },
          { key: "reason", label: "Motivo" },
          { key: "quantity", label: "Cantidad" },
          { key: "unit", label: "Unidad" },
          { key: "responsible", label: "Responsable" },
          { key: "createdAt", label: "Fecha" },
        ];
      case "purchases":
        return [
          { key: "id", label: "ID" },
          { key: "supplierName", label: "Proveedor" },
          { key: "status", label: "Estado" },
          { key: "total", label: "Total" },
          { key: "createdAt", label: "Fecha" },
        ];
      case "sales":
        return [
          { key: "id", label: "ID" },
          { key: "customerName", label: "Cliente" },
          { key: "status", label: "Estado" },
          { key: "total", label: "Total" },
          { key: "createdAt", label: "Fecha" },
        ];
      default:
        return [];
    }
  }

  private toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
    const header = columns.map((col) => col.label).join(",");
    const lines = rows.map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          const text = value === null || value === undefined ? "" : String(value);
          const escaped = text.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    );
    return [header, ...lines].join("\n");
  }

  private async toXlsx(
    title: string,
    columns: { key: string; label: string }[],
    rows: Record<string, unknown>[],
    filters?: Record<string, string | undefined>
  ) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Reporte ${this.getReportTitle(title)}`);

    sheet.properties.defaultRowHeight = 18;

    sheet.addRow([`SERVIFRUT - Reporte de ${this.getReportTitle(title)}`]);
    sheet.addRow([`Fecha: ${new Date().toLocaleString("es-ES")}`]);

    if (filters) {
      const filterLabels: Record<string, string> = {
        productId: "Producto",
        warehouseId: "Bodega",
        movementType: "Tipo mov.",
        reason: "Motivo",
        status: "Estado",
        supplierId: "Proveedor",
        customerId: "Cliente",
        from: "Desde",
        to: "Hasta",
      };
      const filterText = Object.entries(filters)
        .filter(([, value]) => value && value.trim() !== "")
        .map(([key, value]) => `${filterLabels[key] ?? key}: ${value}`)
        .join("  |  ");
      if (filterText) {
        sheet.addRow([`Filtros: ${filterText}`]);
      }
    }

    sheet.addRow([]);
    const headerRow = sheet.addRow(columns.map((col) => col.label));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E8839" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    rows.forEach((row) => {
      sheet.addRow(columns.map((col) => row[col.key] ?? "-"));
    });

    columns.forEach((col, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = Math.max(12, col.label.length + 4);
    });

    return workbook.xlsx.writeBuffer();
  }

  private toPdf(
    title: string,
    columns: { key: string; label: string }[],
    rows: Record<string, unknown>[],
    logoPath?: string,
    pdfSettings?: {
      currencyCode?: string;
      currencySymbol?: string;
      companyName?: string;
      reportSubtitle?: string;
    },
    filters?: Record<string, string | undefined>
  ) {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left;
      const headerTop = 30;

      const headerColor = "#2E8839";
      doc.rect(0, 0, doc.page.width, 90).fill(headerColor);
      doc.fillColor("#ffffff");

      if (logoPath) {
        doc.image(logoPath, startX, headerTop, { width: 50, height: 50 });
      }

      const headerLeft = logoPath ? startX + 70 : startX;
      const company = pdfSettings?.companyName?.trim() || "SERVIFRUT";
      const subtitle =
        pdfSettings?.reportSubtitle?.trim() || "Gestion de Inventarios de Frutas y Verduras";
      doc.fontSize(18).text(company, headerLeft, headerTop + 4);
      doc.fontSize(10).text(subtitle, headerLeft, headerTop + 28);
      doc.fontSize(9).text(new Date().toLocaleString("es-ES"), startX, headerTop + 52, {
        align: "right",
        width: pageWidth,
      });

      doc.fillColor("#2B2B2B");
      doc.moveDown(2.2);
      doc.fontSize(16).text(`Reporte de ${this.getReportTitle(title)}`);
      doc.moveDown(0.6);

      if (filters) {
        const filterLabels: Record<string, string> = {
          productId: "Producto",
          warehouseId: "Bodega",
          movementType: "Tipo mov.",
          reason: "Motivo",
          status: "Estado",
        supplierId: "Proveedor",
        customerId: "Cliente",
          from: "Desde",
          to: "Hasta",
        };
        const filterEntries = Object.entries(filters)
          .filter(([, value]) => value && value.trim() !== "")
          .map(([key, value]) => `${filterLabels[key] ?? key}: ${value}`);
        if (filterEntries.length > 0) {
          doc.fontSize(9).fillColor("#6B7280").text(`Filtros: ${filterEntries.join("  |  ")}`);
          doc.moveDown(0.4);
        }
      }

      const tableTop = doc.y + 6;
      const columnWidth = pageWidth / columns.length;
      const rowHeight = 20;

      doc.rect(startX, tableTop, pageWidth, rowHeight).fill("#E9F5EC");
      doc.fillColor("#2B2B2B").fontSize(10);
      columns.forEach((col, index) => {
        doc.text(col.label, startX + index * columnWidth + 4, tableTop + 5, {
          width: columnWidth - 8,
          align: "left",
        });
      });

      let y = tableTop + rowHeight;
      rows.forEach((row, rowIndex) => {
        if (y + rowHeight > doc.page.height - 40) {
          doc.addPage();
          y = doc.page.margins.top;
        }

        if (rowIndex % 2 === 0) {
          doc.rect(startX, y, pageWidth, rowHeight).fill("#F9FAFB");
        }

        doc.fillColor("#2B2B2B").fontSize(9);
        columns.forEach((col, colIndex) => {
          const value = row[col.key];
          const text = value === null || value === undefined ? "-" : String(value);
          doc.text(text, startX + colIndex * columnWidth + 4, y + 5, {
            width: columnWidth - 8,
            align: "left",
          });
        });
        y += rowHeight;
      });

      const summaryStart = Math.min(y + 10, doc.page.height - 120);
      const formatCurrency = (value: number) => {
        const symbol = pdfSettings?.currencySymbol?.trim() || "$";
        return `${symbol}${value.toFixed(2)}`;
      };
      const buildUnitSummary = (rowsToSum: Record<string, unknown>[], qtyKey: string, unitKey: string) => {
        const summary = new Map<string, number>();
        rowsToSum.forEach((row) => {
          const unit = row[unitKey] ? String(row[unitKey]) : "";
          const qty = row[qtyKey] ? Number(row[qtyKey]) : 0;
          if (!unit || Number.isNaN(qty)) return;
          summary.set(unit, (summary.get(unit) ?? 0) + qty);
        });
        return summary;
      };
      const summaryLines: string[] = [];
      if (title === "purchases" || title === "sales") {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
        summaryLines.push(`Total registros: ${rows.length}`);
        summaryLines.push(`Total general: ${formatCurrency(totalValue)}`);
      } else if (title === "inventory") {
        const summary = buildUnitSummary(rows, "stock", "baseUnit");
        summaryLines.push(`Total registros: ${rows.length}`);
        summary.forEach((value, unit) => {
          summaryLines.push(`Stock total (${unit}): ${value.toFixed(2)}`);
        });
      } else if (title === "movements" || title === "waste") {
        const summary = buildUnitSummary(rows, "quantity", "unit");
        summaryLines.push(`Total registros: ${rows.length}`);
        summary.forEach((value, unit) => {
          summaryLines.push(`Total ${unit}: ${value.toFixed(2)}`);
        });
      } else {
        summaryLines.push(`Total registros: ${rows.length}`);
      }
      doc.fillColor("#6B7280").fontSize(9);
      summaryLines.forEach((line, index) => {
        doc.text(line, startX, summaryStart + index * 12, { align: "right", width: pageWidth });
      });

      doc.end();
    });
  }

  private resolveLogoPath() {
    const candidates = [
      process.env.REPORT_LOGO_PATH,
      path.resolve(process.cwd(), "public", "servifrut-logo.png"),
      path.resolve(process.cwd(), "public", "servifrut-logo.jpg"),
      path.resolve(process.cwd(), "frontend", "public", "servifrut-logo.png"),
      path.resolve(process.cwd(), "frontend", "public", "servifrut-logo.jpg"),
      "/app/public/servifrut-logo.png",
      "/app/public/servifrut-logo.jpg",
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }
}

