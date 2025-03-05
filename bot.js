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
    // Launch Puppeteer browser in non-headless mode
 const browser = await puppeteer.launch({
  headless: "new",  // Use "new" mode for better compatibility
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
});


    const page = await browser.newPage();

    // Navigate to Netflix password reset page
    await page.goto("https://www.netflix.com/loginhelp", {
      waitUntil: "networkidle2", // Wait until the page is fully loaded
    });

    // Wait for the email input field
    await page.waitForSelector('input[name="forgot_password_input"]', { timeout: 120000 });

    // Enter the email address
    await page.type('input[name="forgot_password_input"]', email);
    const errorSelector = 'div[data-uia="error-message-container"]';
    
    // Click the "Email Me" button
    await page.click('button[data-uia="action_forgot_password"]');
    let errorMessage = null;
    console.log("Email entered and 'Email Me' button clicked!");
    try {
      await page.waitForSelector(errorSelector, { timeout: 5000 }); // Wait for error, but don’t crash if it doesn't appear
      errorMessage = await page.$eval(errorSelector, el => el.innerText.trim());
    } catch {
      console.log("✅ No Netflix error message detected.");
    }
    // Wait for 8 seconds to ensure the request is processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (errorMessage) {
      console.error(`❌ Netflix Error: ${errorMessage}`);
      return res.status(400).json({ message: errorMessage });
    }
    // Send success response
    res.status(200).json({ message: "Mail Sent!" });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ message: "Error sending request", error: error.message });
  } finally {
    // Close the browser in all cases (success or error)
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
});
app.get("/", (req, res) => res.send("Server running!"));
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
