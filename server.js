// Ensure static files are served from the 'public' folder
app.use(express.static("public"));

// Add this route specifically to serve index.html at the root URL
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});