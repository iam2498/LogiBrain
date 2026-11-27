const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Maintain a single browser instance globally for performance
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

const CATEGORY_COLORS = {
  "Fuel": "#F59E0B",
  "Food": "#22C55E",
  "Toll": "#3B82F6",
  "Maintenance": "#EF4444",
  "Repair": "#EF4444",
  "Other": "#94A3B8"
};

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);
  return `Rs. ${formatted}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateStr));
};

const formatExpenseDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
};

exports.generateTripPdf = async (trip, expenses, res) => {
  try {
    // 1. Prepare Data
    let totalExpAmt = 0;
    const breakdownMap = {};
    expenses.forEach(exp => {
      totalExpAmt += exp.amount;
      breakdownMap[exp.category] = (breakdownMap[exp.category] || 0) + exp.amount;
    });

    const expectedRevAmt = trip.expectedRevenue || 0;
    const actualRevAmt = trip.actualRevenue || expectedRevAmt;
    const netProfitAmt = actualRevAmt - totalExpAmt;
    const marginPct = actualRevAmt > 0 ? ((netProfitAmt / actualRevAmt) * 100).toFixed(1) : 0;
    const isLoss = netProfitAmt < 0;

    let durationStr = "N/A";
    if (trip.status === "ON_TRIP" || trip.status === "ACTIVE" || !trip.actualEndDate) {
      durationStr = "In progress";
    } else if (trip.actualEndDate && trip.createdAt) {
      const ms = Math.abs(new Date(trip.actualEndDate) - new Date(trip.createdAt));
      const totalMin = Math.round(ms / (1000 * 60));
      if (totalMin < 60) {
        durationStr = `${totalMin} min`;
      } else if (totalMin < 24 * 60) {
        const hrs = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        durationStr = mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
      } else {
        const days = Math.floor(totalMin / (24 * 60));
        const remainingHrs = Math.floor((totalMin % (24 * 60)) / 60);
        durationStr = remainingHrs > 0 ? `${days} day ${remainingHrs} hr` : `${days} day`;
      }
    }

    const cleanCapacity = (cap) => {
      if (!cap) return "N/A";
      const match = String(cap).match(/[\d.]+/);
      return match ? `${match[0]} Tons` : "N/A";
    };

    const rawTrucks =
      trip.truckIds && trip.truckIds.length > 0
        ? trip.truckIds
        : trip.truckId
        ? [trip.truckId]
        : [];
    const rawDrivers =
      trip.driverIds && trip.driverIds.length > 0
        ? trip.driverIds
        : trip.driverId
        ? [trip.driverId]
        : [];

    const truckDriverPairs = rawTrucks.map((trk, idx) => {
      const drv = rawDrivers[idx] || null;
      const drvName = drv?.userId?.name || drv?.licenseNumber || "Unassigned";
      const words = drvName.trim().split(/\s+/).filter(Boolean);
      const initials =
        words.length > 1
          ? `${words[0][0]}${words[1][0]}`.toUpperCase()
          : drvName.substring(0, 2).toUpperCase();
      return {
        index: idx + 1,
        registrationNumber: trk?.registrationNumber || "N/A",
        truckType: trk?.truckType || "N/A",
        capacityStr: cleanCapacity(trk?.capacity),
        driverName: drvName,
        driverInitials: initials,
        licenseNumber: drv?.licenseNumber || "N/A",
        phone: drv?.userId?.phone || "N/A",
      };
    });

    const primaryDriver = rawDrivers[0] || null;
    const driverName = truckDriverPairs.length > 0
      ? truckDriverPairs.map((p) => p.driverName).join(", ")
      : "N/A";

    // Build Donut Gradient
    let donutGradient = "";
    const legendItems = [];
    if (totalExpAmt > 0) {
      let currentPct = 0;
      const sortedCats = Object.entries(breakdownMap).sort((a, b) => b[1] - a[1]);
      
      sortedCats.forEach(([cat, amt], idx) => {
        const pct = (amt / totalExpAmt) * 100;
        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];
        const start = currentPct;
        const end = currentPct + pct;
        donutGradient += `${color} ${start}%, ${color} ${end}%${idx < sortedCats.length - 1 ? ', ' : ''}`;
        currentPct = end;
        
        if (idx < 4) { // Only show top 4 in legend
          legendItems.push({ category: cat, amount: formatCurrency(amt), color });
        }
      });
    }

    // Mini Bar Percents
    const maxBarVal = Math.max(actualRevAmt, totalExpAmt, Math.abs(netProfitAmt));
    const barRevPct = maxBarVal > 0 ? (actualRevAmt / maxBarVal) * 100 : 0;
    const barExpPct = maxBarVal > 0 ? (totalExpAmt / maxBarVal) * 100 : 0;
    const barProfPct = maxBarVal > 0 ? (Math.abs(netProfitAmt) / maxBarVal) * 100 : 0;

    const expensesList = expenses.map(exp => {
      const truckReg = exp.truckId?.registrationNumber || rawTrucks[0]?.registrationNumber || "N/A";
      const addedByName =
        exp.addedByUserId?.name ||
        (exp.addedBy === "DRIVER"
          ? exp.driverId?.userId?.name || exp.driverId?.licenseNumber
          : null) ||
        exp.addedBy ||
        "N/A";
      const addedByRole = exp.addedBy === "OWNER" ? "Owner" : "Driver";

      return {
        dateStr: formatExpenseDate(exp.date || exp.createdAt),
        category: exp.category,
        color: CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Other"],
        description: exp.description,
        hasDesc: !!exp.description,
        amountStr: formatCurrency(exp.amount),
        truckReg,
        addedByLabel: `${addedByName} (${addedByRole})`,
      };
    });

    const templateData = {
      generatedDate: formatDateTime(new Date()),
      trip: trip.toObject ? trip.toObject() : trip,
      actualRev: formatCurrency(actualRevAmt),
      expectedRev: formatCurrency(expectedRevAmt),
      totalExpenses: formatCurrency(totalExpAmt),
      expenseCount: expenses.length,
      netProfit: formatCurrency(Math.abs(netProfitAmt)), // sign handled manually
      isLoss,
      marginPct,
      createdDate: formatDateTime(trip.createdAt),
      completedDate: trip.status === "ON_TRIP" || trip.status === "ACTIVE" || !trip.actualEndDate ? "In progress" : formatDateTime(trip.actualEndDate),
      durationStr,
      truckDriverPairs,
      truckCount: truckDriverPairs.length,
      truck: {
        registrationNumber: rawTrucks.length > 0
          ? rawTrucks.map(t => t.registrationNumber).join(', ')
          : "N/A",
        truckType: rawTrucks[0]?.truckType || "N/A",
        capacityStr: rawTrucks.length > 0
          ? `${rawTrucks.reduce((sum, t) => sum + (parseFloat(t.capacity) || 0), 0)} Tons`
          : "N/A"
      },
      driver: {
        initials: (primaryDriver?.userId?.name || driverName).substring(0, 2).toUpperCase(),
        name: driverName,
        licenseNumber: rawDrivers.length > 0
          ? rawDrivers.map(d => d.licenseNumber).join(', ')
          : "N/A",
        phone: primaryDriver?.userId?.phone || "N/A"
      },
      hasExpenses: totalExpAmt > 0,
      donutGradient,
      legendItems,
      barRevPct,
      barExpPct,
      barProfPct,
      expensesList
    };

    // 2. Load Template
    const templatePath = path.join(__dirname, 'tripReportTemplate.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const htmlContent = template(templateData);

    // 3. Generate PDF with Puppeteer
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; font-family: Helvetica, sans-serif; color: #64748B; padding: 0 1cm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 8px; margin-bottom: -15px;">
          <span>LogiBrain - Trip Report | Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          <span>Generated by LogiBrain</span>
        </div>
      `,
      margin: {
        top: '1cm',
        bottom: '2cm',
        left: '1cm',
        right: '1cm'
      }
    });

    await page.close();

    // 4. Send Response
    if (res) {
      const filename = `LogiBrain_Trip_Report_${trip._id}.pdf`;
      res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-type', 'application/pdf');
      res.end(pdfBuffer);
    }
    
    return pdfBuffer;

  } catch (error) {
    console.error("Puppeteer PDF Error:", error);
    if (res && !res.headersSent) {
      res.status(500).json({ success: false, message: "PDF generation failed" });
    }
    throw error;
  }
};
