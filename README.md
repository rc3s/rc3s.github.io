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
| `css/` | `tokens.css` (colours, type, spacing), `base.css` (page layout) and one stylesheet per page, like `words.css` |
| `js/` | Scripts for the interactive pages |
| `data/` | The lists the site reads: words, restaurants, commonplace book |
| `work/` | Case-study pages |
| `personal/` | Personal pages and project write-ups |
| `img/` | Images (compress before adding) |

Links between pages are relative, so the site keeps working if the repo is renamed or a custom domain is added.

## Editing a list

Lists are plain data files in `data/`, read by their page. The Words page reads `data/words.csv`, one word per row, with these columns:

| Column | What goes in it |
| --- | --- |
| `word` | The word |
| `status` | `new` (still learning) or `kept` |
| `meaning` | Short meaning (optional, fine to leave blank for now) |
| `why` | One line on why it's on the list (optional) |
| `where_found` | Where you came across it (optional) |
| `date_added` | `YYYY-MM-DD`, or `legacy` for words from before dates were tracked |
| `date_kept` | `YYYY-MM-DD` when it moved to kept (optional) |
| `note` | Anything else (optional) |

To add a word, add one row at the bottom of the file. A later row counts as newer, which is how the Recently added list is ordered.

Rules for CSV rows, because one slip shifts every column after it:

- Always keep all 8 columns, even when some are empty: `Quay,new,"A landing place by the water.",,,2026-12-01,,`
- Wrap the **meaning**, **why**, **where_found** and **note** fields in double quotes, since they often contain commas.
- If a quoted field itself needs a double quote, write it twice: `"he said ""no"""`.
- Dates are `YYYY-MM-DD`. New words get the real date.
- Blank lines are ignored.

The page shows a message naming the line of any row it can't read, and still shows the rest of the list.

## Status

Skeleton plus the Words page (`personal/words/`), currently showing a small sample list. Next up is moving the full word list into `data/words.csv`.
