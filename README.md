# rc3s.github.io

Personal portfolio site of Richard Sidoli III. Live at https://rc3s.github.io/.

It is plain HTML, CSS and a little JavaScript. There is no build step: whatever is on `main` is what GitHub Pages publishes, usually within a minute or two.

## How changes get made

`main` is protected, so every change goes through a pull request:

1. Make the change on a new branch (GitHub's web editor offers this when you commit).
2. Open the pull request and read the **Files changed** tab.
3. Click **Merge**. The live site updates shortly after.

## Folders

| Folder | What lives there |
| --- | --- |
| `css/` | `tokens.css` (colours, type, spacing) and `base.css` (page layout) |
| `js/` | Scripts for the interactive pages |
| `data/` | The lists the site reads: words, restaurants, commonplace book |
| `work/` | Case-study pages |
| `personal/` | Personal pages and project write-ups |
| `img/` | Images (compress before adding) |

Links between pages are relative, so the site keeps working if the repo is renamed or a custom domain is added.

## Editing a list

Lists are plain data files in `data/`, read by their page. The Words page will use `data/words.csv` (added in the next pull request). To add a word you will add one row at the bottom of that file.

Rules for CSV rows, because one slip shifts every column after it:

- Wrap the **meaning** and **note** fields in double quotes, since they often contain commas.
- If a quoted field itself needs a double quote, write it twice: `"he said ""no"""`.
- Dates are `YYYY-MM-DD`.
- One word per line, no blank lines in the middle.

The page flags any row it can't read instead of failing, so a typo shows up as a message naming the bad row.

## Status

Skeleton only: placeholder home page, 404 page, and the base styles. Next up is the Words page.
