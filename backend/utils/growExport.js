const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate a PDF export of a plant's grow journey
 * @param {Object} plant - Plant document
 * @param {Array} logs - Array of GrowLog documents
 * @param {String} outputPath - Full path where PDF should be saved
 */
async function generatePlantPDF(plant, logs, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc.fontSize(24).text(`Grow Report: ${plant.name}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Strain: ${plant.strain || "N/A"}`, { align: "center" });
      doc.text(`Medium: ${plant.growMedium || "N/A"}`, { align: "center" });
      doc.text(
        `Started: ${plant.startDate ? new Date(plant.startDate).toLocaleDateString() : "N/A"}`,
        {
          align: "center"
        }
      );
      doc.text(`Current Stage: ${plant.stage || "N/A"}`, { align: "center" });
      doc.moveDown(2);

      // Summary Stats
      const totalDays = plant.startDate
        ? Math.floor((new Date() - new Date(plant.startDate)) / (1000 * 60 * 60 * 24))
        : 0;
      const heightLogs = logs.filter((l) => typeof l.heightCm === "number");
      const maxHeight = heightLogs.length
        ? Math.max(...heightLogs.map((l) => l.heightCm))
        : 0;

      doc.fontSize(16).text("Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`Total Days: ${totalDays}`);
      doc.text(`Total Logs: ${logs.length}`);
      doc.text(`Max Height: ${maxHeight} cm`);
      doc.moveDown(2);

      // Logs Timeline
      doc.fontSize(16).text("Timeline", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      logs.forEach((log, index) => {
        const logDate = log.date ? new Date(log.date).toLocaleDateString() : "N/A";
        const dayNumber = plant.startDate
          ? Math.floor(
              (new Date(log.date) - new Date(plant.startDate)) / (1000 * 60 * 60 * 24)
            )
          : 0;

        doc.text(`Day ${dayNumber} - ${logDate}`, { continued: false });

        if (log.stageOverride) {
          doc.text(`  Stage: ${log.stageOverride}`);
        }

        if (typeof log.heightCm === "number") {
          doc.text(`  Height: ${log.heightCm} cm`);
        }

        if (log.environment) {
          const env = log.environment;
          if (env.temp) doc.text(`  Temp: ${env.temp}°C`);
          if (env.humidity) doc.text(`  Humidity: ${env.humidity}%`);
          if (env.ph) doc.text(`  pH: ${env.ph}`);
        }

        if (log.note) {
          doc.text(`  Note: ${log.note}`);
        }

        doc.moveDown(0.5);

        // Add page break if needed
        if (doc.y > 700 && index < logs.length - 1) {
          doc.addPage();
        }
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, {
        align: "center"
      });
      doc.text("GrowPathAI - Track, Learn, Grow", { align: "center" });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePlantPDF };
