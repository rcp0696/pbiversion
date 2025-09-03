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

    await octokit.repos.createOrUpdateFileContents({
      // IMPORTANT: Change these two lines
      owner: "rcp0696", 
      repo: "pbiversion",
      
      path: reportFile.name,
      message: commitMessage,
      content: fileContentBase64,
      encoding: "base64",
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