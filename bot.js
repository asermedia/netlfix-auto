import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const PORT = process.env.PORT || 8000;
const app = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate email format
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

app.post("/reset-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  console.log("Received request with email:", email);

  let browser;
  try {
    console.log("🚀 Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.goto("https://www.netflix.com/loginhelp", { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for the email input field
    await page.waitForSelector('input[name="forgot_password_input"]', { timeout: 120000 });

    // Enter the email address
    await page.type('input[name="forgot_password_input"]', email);

    // Click the "Email Me" button
    await page.click('button[data-uia="action_forgot_password"]');
    console.log("📩 Email entered and 'Email Me' button clicked!");

    // Check for Netflix errors
    const errorSelector = 'div[data-uia="error-message-container"]';
    let errorMessage = null;
    try {
      await page.waitForSelector(errorSelector, { timeout: 5000 });
      errorMessage = await page.$eval(errorSelector, (el) => el.innerText.trim());
    } catch {
      console.log("✅ No Netflix error message detected.");
    }

    // Wait for the request to be processed
    await new Promise((resolve) => setTimeout(resolve, 6000));

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
