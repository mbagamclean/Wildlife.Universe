<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
  xmlns="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes"
    doctype-system="about:legacy-compat" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Wildlife Universe — Sitemap</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0d1210;
            color: rgba(255,255,255,0.85);
            line-height: 1.55;
          }
          a { color: #d4af37; text-decoration: none; }
          a:hover { text-decoration: underline; color: #e9c66a; }
          .header {
            background: linear-gradient(135deg, #0c4a1a 0%, #143a23 50%, #1f2a20 100%);
            border-bottom: 1px solid rgba(212,175,55,0.18);
            padding: 3rem 1.5rem 2rem;
          }
          .container { max-width: 1180px; margin: 0 auto; }
          .eyebrow {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #d4af37;
            margin-bottom: 0.6rem;
          }
          h1 {
            font-size: 2.1rem;
            font-weight: 700;
            margin: 0 0 0.4rem;
            color: #fff;
            letter-spacing: -0.02em;
          }
          .lead {
            color: rgba(255,255,255,0.6);
            font-size: 0.95rem;
            margin: 0;
            max-width: 560px;
          }
          .stats {
            display: flex;
            gap: 1rem;
            margin-top: 1.6rem;
            flex-wrap: wrap;
          }
          .stat {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(212,175,55,0.22);
            border-radius: 0.85rem;
            padding: 0.7rem 1.1rem;
            min-width: 110px;
          }
          .stat-num {
            font-size: 1.4rem;
            font-weight: 700;
            color: #d4af37;
          }
          .stat-label {
            font-size: 0.7rem;
            color: rgba(255,255,255,0.55);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 0.15rem;
          }
          .body {
            padding: 2rem 1.5rem 4rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 0.85rem;
            overflow: hidden;
            font-size: 0.88rem;
          }
          th, td {
            padding: 0.7rem 0.95rem;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            vertical-align: top;
          }
          th {
            background: rgba(255,255,255,0.04);
            font-weight: 700;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255,255,255,0.45);
          }
          tr:hover td { background: rgba(212,175,55,0.04); }
          tr:last-child td { border-bottom: 0; }
          td.url {
            word-break: break-all;
            max-width: 540px;
          }
          td.dim { color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; }
          .pill {
            display: inline-block;
            padding: 0.15rem 0.55rem;
            border-radius: 9999px;
            background: rgba(212,175,55,0.12);
            border: 1px solid rgba(212,175,55,0.32);
            color: #d4af37;
            font-size: 0.7rem;
            font-weight: 600;
          }
          img.thumb {
            width: 60px;
            height: 40px;
            object-fit: cover;
            border-radius: 0.4rem;
            background: rgba(255,255,255,0.05);
          }
          .footer-note {
            margin-top: 1.5rem;
            font-size: 0.78rem;
            color: rgba(255,255,255,0.4);
            text-align: center;
          }
          @media (max-width: 720px) {
            h1 { font-size: 1.6rem; }
            th, td { padding: 0.55rem 0.7rem; font-size: 0.82rem; }
            td.url { max-width: 240px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="container">
            <div class="eyebrow">Wildlife Universe · Sitemap</div>
            <xsl:choose>
              <xsl:when test="s:sitemapindex">
                <h1>Sitemap Index</h1>
                <p class="lead">A directory of every sitemap published by Wildlife Universe — submit this URL to Google Search Console and Bing Webmaster Tools.</p>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-num"><xsl:value-of select="count(s:sitemapindex/s:sitemap)" /></div>
                    <div class="stat-label">Sitemaps</div>
                  </div>
                </div>
              </xsl:when>
              <xsl:otherwise>
                <h1>Sitemap</h1>
                <p class="lead">URLs Wildlife Universe wants search engines to crawl. Updated automatically as new posts, pages, and media are published.</p>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-num"><xsl:value-of select="count(s:urlset/s:url)" /></div>
                    <div class="stat-label">URLs</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num"><xsl:value-of select="count(s:urlset/s:url/image:image)" /></div>
                    <div class="stat-label">Images</div>
                  </div>
                  <div class="stat">
                    <div class="stat-num"><xsl:value-of select="count(s:urlset/s:url/video:video)" /></div>
                    <div class="stat-label">Videos</div>
                  </div>
                </div>
              </xsl:otherwise>
            </xsl:choose>
          </div>
        </div>

        <div class="body container">
          <xsl:choose>
            <xsl:when test="s:sitemapindex">
              <table>
                <thead>
                  <tr><th>Sitemap</th><th>Last Modified</th></tr>
                </thead>
                <tbody>
                  <xsl:for-each select="s:sitemapindex/s:sitemap">
                    <tr>
                      <td class="url"><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                      <td class="dim"><xsl:value-of select="s:lastmod" /></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Media</th>
                    <th>Last Modified</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td class="url"><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                      <td>
                        <xsl:choose>
                          <xsl:when test="image:image">
                            <img class="thumb" src="{image:image[1]/image:loc}" loading="lazy" alt="" />
                            <xsl:if test="count(image:image) &gt; 1">
                              <span class="pill" style="margin-left: 0.4rem;">+<xsl:value-of select="count(image:image) - 1" /></span>
                            </xsl:if>
                          </xsl:when>
                          <xsl:when test="video:video">
                            <img class="thumb" src="{video:video/video:thumbnail_loc}" loading="lazy" alt="" />
                            <span class="pill" style="margin-left: 0.4rem;">video</span>
                          </xsl:when>
                          <xsl:otherwise>
                            <span class="dim">—</span>
                          </xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="dim"><xsl:value-of select="s:lastmod" /></td>
                      <td class="dim"><xsl:value-of select="s:priority" /></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
          <p class="footer-note">
            This XML is auto-generated. Visit <a href="/sitemap">/sitemap</a> for the human-readable site map.
          </p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
