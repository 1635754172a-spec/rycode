export interface GitHubRepoContent {
  title: string;
  text: string;
}

export async function extractGitHubRepo(repoUrl: string): Promise<GitHubRepoContent> {
  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('无效的 GitHub 仓库链接');
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'RYcode-Bot/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Get repo metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.status}`);
  const repoData = await repoRes.json() as { description: string; full_name: string; default_branch: string };

  // Get README
  let readmeText = '';
  try {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
      { headers: { ...headers, Accept: 'application/vnd.github.v3.raw' } }
    );
    if (readmeRes.ok) readmeText = await readmeRes.text();
  } catch { /* README not available */ }

  // Get top-level file tree
  let fileTree = '';
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${repoData.default_branch}?recursive=1`,
      { headers }
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json() as { tree: { path: string; type: string }[] };
      fileTree = treeData.tree
        .filter(f => f.type === 'blob')
        .slice(0, 50)
        .map(f => f.path)
        .join('\n');
    }
  } catch { /* tree not available */ }

  const title = `${owner}/${cleanRepo}`;
  const text = [
    `仓库: ${repoData.full_name}`,
    repoData.description ? `描述: ${repoData.description}` : '',
    '',
    'README:',
    readmeText.slice(0, 6000),
    '',
    '文件结构:',
    fileTree,
  ].filter(Boolean).join('\n');

  return { title, text };
}
