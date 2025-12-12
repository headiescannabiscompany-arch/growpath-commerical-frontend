const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

async function generateCertificatePDF({
  studentName,
  courseTitle,
  creatorName,
  creatorSignatureUrl,
  certificateId,
  completionDate,
  outputPath,
  verificationUrl,
  watermarkPath,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure certificates directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // === Background Watermark ===
      if (watermarkPath && fs.existsSync(watermarkPath)) {
        doc.opacity(0.05);
        const centerX = doc.page.width / 2 - 150;
        const centerY = doc.page.height / 2 - 150;
        doc.image(watermarkPath, centerX, centerY, { width: 300 });
        doc.opacity(1);
      }

      // === Border ===
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(4)
        .strokeColor("#C9A86A")
        .stroke();

      // === Title ===
      doc
        .fontSize(28)
        .font("Times-Bold")
        .fillColor("#333")
        .text("Certificate of Completion", {
          align: "center",
          underline: false,
        });

      doc.moveDown(2);

      // === Subtitle ===
      doc
        .fontSize(14)
        .font("Times-Roman")
        .text("This certifies that", { align: "center" });

      doc.moveDown(1);

      // === Student Name ===
      doc
        .fontSize(24)
        .font("Times-Bold")
        .text(studentName, { align: "center" });

      doc.moveDown(1.2);

      // === Course Title ===
      doc
        .fontSize(14)
        .font("Times-Roman")
        .text("Has successfully completed the course:", { align: "center" });

      doc.moveDown(0.5);

      doc
        .font("Times-Bold")
        .fontSize(20)
        .text(courseTitle, { align: "center" });

      doc.moveDown(2);

      // === Completion Date ===
      doc
        .font("Times-Roman")
        .fontSize(12)
        .text(`Completed on ${completionDate}`, { align: "center" });

      doc.moveDown(3);

      // === Creator Signature ===
      if (creatorSignatureUrl && fs.existsSync(creatorSignatureUrl)) {
        try {
          doc.image(creatorSignatureUrl, doc.page.width / 2 - 60, doc.y, {
            width: 120,
            height: 40,
          });
          doc.moveDown(2);
        } catch (err) {
          console.log("Error adding signature:", err.message);
        }
      }

      doc
        .font("Times-Bold")
        .fontSize(12)
        .text(creatorName, { align: "center" });

      doc.text("Course Instructor", { align: "center" });

      // === QR Code ===
      try {
        const qrImage = await QRCode.toDataURL(verificationUrl);
        const qrPath = path.join(__dirname, "../temp_qr.png");
        const qrBase64Data = qrImage.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(qrPath, qrBase64Data, "base64");

        doc.image(qrPath, 40, doc.page.height - 160, {
          width: 100,
        });

        // Clean up temp QR code
        fs.unlinkSync(qrPath);
      } catch (err) {
        console.log("Error generating QR code:", err.message);
      }

      doc
        .fontSize(10)
        .text(`Certificate ID: ${certificateId}`, 40, doc.page.height - 50);

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateCertificatePDF;
