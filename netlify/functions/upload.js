const { Octokit } = require("@octokit/rest");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const githubToken = process.env.GITHUB_PAT;
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ message: "GitHub token is not configured on Netlify." }) };
  }

  const octokit = new Octokit({ auth: githubToken });

  try {
    const { commitMessage, reportFile } = JSON.parse(event.body);

    if (!reportFile || !reportFile.name || !reportFile.content) {
      return { statusCode: 400, body: JSON.stringify({ message: "File data is missing or incomplete." }) };
    }

    const fileContentBase64 = reportFile.content.split(",")[1];
    
    // --- NEW LOGIC: Check if the file already exists to get its SHA ---
    let sha;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner: "rcp0696",
        repo: "pbiversion",
        path: reportFile.name,
      });
      // If the file exists, we get its SHA
      sha = existingFile.sha;
    } catch (error) {
      // A 404 error means the file doesn't exist, which is fine.
      // We'll proceed without a SHA. For any other error, we'll fail.
      if (error.status !== 404) {
        throw error;
      }
    }
    // --- END NEW LOGIC ---

    // This one function now handles both creating and updating
    await octokit.repos.createOrUpdateFileContents({
      owner: "rcp0696",
      repo: "pbiversion",
      path: reportFile.name,
      message: commitMessage,
      content: fileContentBase64,
      encoding: "base64",
      sha: sha, // <-- THE CRUCIAL ADDITION. It will be undefined for new files.
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File uploaded successfully to GitHub!" }),
    };
  } catch (error) {
    console.error("GitHub API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Something went wrong during the GitHub upload.", error: error.message }),
    };
  }
};

