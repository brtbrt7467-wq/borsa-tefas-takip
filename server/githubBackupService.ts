import { BackupPayload } from './sheetsBackupService';

interface GitHubBackupOptions {
  token?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  commitMessage?: string;
}

interface GitHubFileResponse {
  sha?: string;
  content?: string;
  message?: string;
}

/**
 * Commits a portfolio backup JSON directly to the user's GitHub repository.
 */
export async function saveBackupToGitHub(
  payload: BackupPayload,
  options: GitHubBackupOptions
): Promise<{ 
  success: boolean; 
  commitUrl?: string; 
  fileUrl?: string; 
  rawUrl?: string; 
  fileName?: string; 
  error?: string 
}> {
  try {
    const token = options.token || process.env.GITHUB_TOKEN || '';
    const owner = options.owner || process.env.GITHUB_OWNER || 'brtbrt7467-wq';
    const repo = options.repo || process.env.GITHUB_REPO || 'borsa-tefas-takip';
    const branch = options.branch || 'main';

    if (!token) {
      return {
        success: false,
        error: 'GitHub Personal Access Token (PAT) gerekli. Lütfen repo yazma yetkisine ("contents: write" veya "repo") sahip bir token girin.'
      };
    }

    if (!owner || !repo) {
      return {
        success: false,
        error: 'GitHub kullanıcı adı (owner) veya depo adı (repo) eksik.'
      };
    }

    const now = new Date(payload.timestamp || Date.now());
    const dateStr = now.toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      timeZone: 'Europe/Istanbul' 
    }).replace(/\./g, '-');
    
    const timeStr = now.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      timeZone: 'Europe/Istanbul' 
    }).replace(/:/g, '-');

    const fileName = `backups/portfolio_${dateStr}_${timeStr}.json`;
    const latestFileName = 'backups/portfolio-latest.json';

    // JSON payload
    const jsonString = JSON.stringify({
      version: '1.0',
      type: 'bist_tefas_portfolio_backup',
      generatedAt: now.toISOString(),
      formattedDate: `${dateStr} ${timeStr} (TSİ)`,
      summary: payload.summary,
      portfolioItems: payload.portfolioItems,
      watchlist: payload.watchlist || [],
      alerts: payload.alerts || []
    }, null, 2);

    const base64Content = Buffer.from(jsonString, 'utf-8').toString('base64');
    const commitMsg = options.commitMessage || `📦 Otomatik Portföy Yedeği - ${dateStr} ${timeStr} TSİ`;

    // 1. Check existing latest file sha to update it cleanly
    let existingLatestSha: string | undefined;
    try {
      const checkRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${latestFileName}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'BorsaTefasTakipApp'
          }
        }
      );
      if (checkRes.ok) {
        const fileData = await checkRes.json() as GitHubFileResponse;
        existingLatestSha = fileData.sha;
      }
    } catch (e) {
      // Ignore not found
    }

    // 2. Put portfolio-latest.json
    const putLatestRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${latestFileName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'BorsaTefasTakipApp'
        },
        body: JSON.stringify({
          message: commitMsg,
          content: base64Content,
          branch,
          ...(existingLatestSha ? { sha: existingLatestSha } : {})
        })
      }
    );

    if (!putLatestRes.ok) {
      const errText = await putLatestRes.text();
      console.error('[GitHubBackup] Put latest error:', putLatestRes.status, errText);
      if (putLatestRes.status === 401) {
        return { success: false, error: 'GitHub Token geçersiz veya yetkisiz (401 Bad credentials). Lütfen tokenınızı kontrol edin.' };
      }
      if (putLatestRes.status === 404) {
        return { success: false, error: `GitHub deposu bulunamadı: ${owner}/${repo} (404). Deponun var olduğundan ve tokenın bu repoya erişim izni olduğundan emin olun.` };
      }
      if (putLatestRes.status === 403) {
        return { success: false, error: 'GitHub yetki yetersiz (403 Forbidden). Token için "repo" veya "contents: write" izni gereklidir.' };
      }
      return { success: false, error: `GitHub API hatası (${putLatestRes.status}): ${errText}` };
    }

    const putData = await putLatestRes.json();

    // 3. Also create timestamped backup snapshot for historical tracking
    try {
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'BorsaTefasTakipApp'
          },
          body: JSON.stringify({
            message: `Snapshot: ${commitMsg}`,
            content: base64Content,
            branch
          })
        }
      );
    } catch (e) {
      console.warn('[GitHubBackup] Historical snapshot warning:', e);
    }

    const htmlUrl = putData?.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${latestFileName}`;
    const commitUrl = putData?.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`;

    return {
      success: true,
      fileUrl: htmlUrl,
      commitUrl,
      fileName: latestFileName
    };
  } catch (err: any) {
    console.error('[GitHubBackup] Unexpected error:', err);
    return { success: false, error: err.message || 'GitHub yedeği alınırken beklenmeyen bir hata oluştu.' };
  }
}

/**
 * Lists available backup files stored in the repository's backups/ directory.
 */
export async function listGitHubBackups(
  token?: string,
  owner?: string,
  repo?: string,
  branch: string = 'main'
): Promise<{ success: boolean; files?: Array<{ name: string; path: string; html_url: string; size: number; download_url: string }>; error?: string }> {
  try {
    const ghToken = token || process.env.GITHUB_TOKEN || '';
    const ghOwner = owner || process.env.GITHUB_OWNER || 'brtbrt7467-wq';
    const ghRepo = repo || process.env.GITHUB_REPO || 'borsa-tefas-takip';

    if (!ghToken) {
      return { success: false, error: 'GitHub Token gerekli.' };
    }

    const res = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/backups?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BorsaTefasTakipApp'
        }
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        // No backups directory yet
        return { success: true, files: [] };
      }
      const errText = await res.text();
      return { success: false, error: `GitHub listeleme hatası: ${res.status} ${errText}` };
    }

    const items = await res.json();
    if (!Array.isArray(items)) {
      return { success: true, files: [] };
    }

    const jsonFiles = items
      .filter((i: any) => i.name.endsWith('.json'))
      .sort((a: any, b: any) => b.name.localeCompare(a.name))
      .map((i: any) => ({
        name: i.name,
        path: i.path,
        html_url: i.html_url,
        size: i.size,
        download_url: i.download_url
      }));

    return { success: true, files: jsonFiles };
  } catch (err: any) {
    return { success: false, error: err.message || 'GitHub yedekleri listelenemedi.' };
  }
}

/**
 * Downloads and parses backup file content from GitHub repository.
 */
export async function getGitHubBackupContent(
  filePath: string,
  token?: string,
  owner?: string,
  repo?: string,
  branch: string = 'main'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const ghToken = token || process.env.GITHUB_TOKEN || '';
    const ghOwner = owner || process.env.GITHUB_OWNER || 'brtbrt7467-wq';
    const ghRepo = repo || process.env.GITHUB_REPO || 'borsa-tefas-takip';

    if (!ghToken) {
      return { success: false, error: 'GitHub Token gerekli.' };
    }

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const res = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${cleanPath}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BorsaTefasTakipApp'
        }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Dosya GitHub'dan alınamadı: ${res.status} ${errText}` };
    }

    const fileMeta = await res.json();
    if (!fileMeta.content) {
      return { success: false, error: 'Dosya içeriği boş veya okunamadı.' };
    }

    const decoded = Buffer.from(fileMeta.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    return { success: true, data: parsed };
  } catch (err: any) {
    return { success: false, error: err.message || 'GitHub yedek içeriği çözülemedi.' };
  }
}
