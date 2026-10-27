# Wiki source

The ten published Markdown files in this folder are the source for the [GitHub wiki](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki). The banner and current screenshots under `assets/` are referenced from this main repository using raw GitHub URLs; the publish script copies Markdown pages only.

Edit these files, commit them, then publish from the repository root:

```bash
bash scripts/publish-wiki.sh --dry-run
bash scripts/publish-wiki.sh
```

The script clones the existing wiki, copies the pages, previews the diff and pushes a normal commit using your configured Git identity. It does not delete unrelated wiki pages. Create the initial Home page in GitHub first if the wiki has never been saved.

GitHub controls the wiki's fonts and page layout. The visual design uses a custom SVG banner, compact navigation, tables, Mermaid, a sidebar and a footer within GitHub's supported Markdown.

## Current UI screenshots

Captured on **27 October 2026** from source `2e93548`, using the local production build, an isolated file store and a separate headless Chrome profile. All names, commitments and readings are synthetic. The existing 25 October design images and earlier native simulator image remain historical evidence.

| Image | Current feature |
| --- | --- |
| [Week overview](assets/2026-10-27-calendar-desktop.png) | Violet shift ratings, blue reading dots and the day-panel graph. |
| [Stress on hover](assets/2026-10-27-calendar-hover-stress.png) | A 3D shift opens a timed stress bar graph. |
| [Heart on hover](assets/2026-10-27-calendar-hover-heart.png) | Heart switch and the matching hover graph. |
| [Shift detail](assets/2026-10-27-shift-detail.png) | Work rating and both signal graphs. |
| [Desktop ask](assets/2026-10-27-ask-desktop.png) | Past-shift rows and the three answer names. |
| [Mobile ask](assets/2026-10-27-ask-mobile.png) | The same ask on a 390-pixel viewport. |

[Browser check record](assets/2026-10-27-browser-checks.json). These screenshots document the interface, not real sensor accuracy or worker outcomes.
