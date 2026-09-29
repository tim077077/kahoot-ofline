// Where finished slideshows get sent. Today only the demo poster exists: it
// accepts the slides and pretends to deliver them, so the whole flow can be
// built and tested before TikTok approves the app.
//
// The real integration is TikTok's official Content Posting API in draft mode
// (MEDIA_UPLOAD): the carousel lands in the creator's TikTok inbox, they add a
// trending sound and post. That mode works without TikTok's audit. It needs a
// TikTok developer app with Login Kit (scope video.upload), and the images
// hosted on a domain you've verified with TikTok. See README.md.
//
// Never use unofficial or reverse-engineered posting: it gets your customers'
// accounts flagged and breaks whenever TikTok changes its app.

export type PostResult = { provider: string; id: string; mock: boolean; message: string };

export interface Poster {
  readonly name: string;
  sendToDrafts(slides: Blob[], caption: string): Promise<PostResult>;
}

class DemoPoster implements Poster {
  readonly name = "demo";

  async sendToDrafts(slides: Blob[]): Promise<PostResult> {
    return {
      provider: this.name,
      id: `demo_${crypto.randomUUID()}`,
      mock: true,
      message: `Demo mode: ${slides.length} slides received, nothing was posted to TikTok.`,
    };
  }
}

export function getPoster(): Poster {
  return new DemoPoster();
}
