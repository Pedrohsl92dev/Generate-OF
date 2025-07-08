# Generate-OF

Script to extract commits from multiple local Git repositories for a specific author and date range. It also groups the changed files by USTIBB task code.

## Configuration

Edit `config.json` with the following fields:

- `baseDir`: folder containing your git projects
- `author`: author name or email to filter commits
- `since`/`until`: date range (format YYYY-MM-DD)
- `outputDir`: folder where result files will be written
- `allowDuplicates`: when `false`, only the most recent change of each file is listed
- `task`: task number to associate with effort entries 5.32.x in the final report

A sample file is provided in `config.example.json`.
The USTIBB task definitions are stored in `ustibb_map.json`. Edit this file if you need to adjust the codes or point values.

## Usage

```bash
npm install
npm start
```

The script will search for repositories under `baseDir` and create one text file per project in `outputDir` listing modified files. Each line contains the file path, the abbreviated commit hash and, when present in the commit message, the task number. The number may contain any amount of digits:

```
path/to/file.java#abcdef1234; task 1234567
```

In the generated files the entries are grouped by USTIBB code. Each block shows the files and the score calculated from `ustibb_map.json`.

The consolidated `final-commit-report.txt` also includes the activities 5.32.1,
5.32.2 and 5.32.3 using the task number set in `config.json`.
