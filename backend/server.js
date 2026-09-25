const app = require("./app");
const { connectDB } = require("./config/db");
const { PORT } = require("./config/env");

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});
