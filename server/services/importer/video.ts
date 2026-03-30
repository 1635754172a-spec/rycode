export interface VideoContent {
  title: string;
  text: string;
}

export async function extractVideoContent(url: string): Promise<VideoContent> {
  // Extract YouTube video ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (!ytMatch) {
    // Non-YouTube: fallback to URL text extraction
    const { extractUrlText } = await import('./url.js');
    return extractUrlText(url);
  }

  const videoId = ytMatch[1];

  // Try YouTube Data API v3 if key provided
  if (process.env.YOUTUBE_API_KEY) {
    const apiRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${process.env.YOUTUBE_API_KEY}`
    );
    if (apiRes.ok) {
      const data = await apiRes.json() as {
        items: { snippet: { title: string; description: string; tags?: string[] } }[];
      };
      const item = data.items[0];
      if (item) {
        return {
          title: item.snippet.title,
          text: [
            `视频标题: ${item.snippet.title}`,
            '',
            '视频描述:',
            item.snippet.description.slice(0, 3000),
            '',
            item.snippet.tags ? `标签: ${item.snippet.tags.join(', ')}` : '',
          ].filter(Boolean).join('\n'),
        };
      }
    }
  }

  // Fallback: scrape YouTube page for title + description
  const { extractUrlText } = await import('./url.js');
  const { title, text } = await extractUrlText(`https://www.youtube.com/watch?v=${videoId}`);
  return { title, text: `YouTube 视频: ${title}\n\n${text.slice(0, 4000)}` };
}
