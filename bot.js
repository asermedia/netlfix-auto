import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const PORT = 8000;
const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  console.log("Received request with email:", email);

  let browser;
  try {
    console.log("🚀 Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true, // Run in headless mode for performance
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath: puppeteer.executablePath(), // Ensures compatibility on Railway
    });

    const page = await browser.newPage();
    await page.goto("https://www.netflix.com/loginhelp", { waitUntil: "networkidle2" });

    // Wait for the email input field
    await page.waitForSelector('input[name="forgot_password_input"]', { timeout: 120000 });

    // Enter the email address
    await page.type('input[name="forgot_password_input"]', email);

    // Click the "Email Me" button
    await page.click('button[data-uia="action_forgot_password"]');
    console.log("📩 Email entered and 'Email Me' button clicked!");

    // Wait a short time to check for Netflix errors
    const errorSelector = 'div[data-uia="error-message-container"]';
    let errorMessage = null;
    try {
      await page.waitForSelector(errorSelector, { timeout: 5000 }); // Detect error
      errorMessage = await page.$eval(errorSelector, el => el.innerText.trim());
    } catch {
      console.log("✅ No Netflix error message detected.");
    }

    // Ensure request is processed
    await page.waitForTimeout(3000);

    if (errorMessage) {
      console.error(`❌ Netflix Error: ${errorMessage}`);
      return res.status(400).json({ message: errorMessage });
    }

    res.status(200).json({ message: "Mail Sent!" });
  } catch (error) {
    console.error("🔥 An error occurred:", error);
    res.status(500).json({ message: "Error sending request", error: error.message });
  } finally {
    if (browser) {
      console.log("🛑 Closing browser...");
      await browser.close();
      console.log("✅ Browser closed.");
    }
  }
});

app.get("/", (req, res) => res.send("✅ Server is running!"));

app.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));
