# Wiki source

The ten published Markdown files in this folder are the source for the [GitHub wiki](https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki). `assets/banner.svg` is the banner referenced by the Home page from this main repository.

Edit these files, commit them, then publish from the repository root:

```bash
bash scripts/publish-wiki.sh --dry-run
bash scripts/publish-wiki.sh
```

The script clones the existing wiki, copies the pages, previews the diff and pushes a normal commit using your configured Git identity. It does not delete unrelated wiki pages. Create the initial Home page in GitHub first if the wiki has never been saved.

GitHub controls the wiki's fonts and page layout. The visual design uses a custom SVG banner, compact navigation, tables, Mermaid, a sidebar and a footer within GitHub's supported Markdown.
