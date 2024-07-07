const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/execute", (req, res) => {
  const { language, code } = req.body;
  let filename;

  if (language === "java") {
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    let className = "Main";
    if (classNameMatch) {
      className = classNameMatch[1];
    } else {
      // Wrap the user's code into a public class Main if no public class is found
      code = `
            public class ${className} {
                public static void main(String[] args) {
                    ${code}
                }
            }
            `;
    }
    filename = path.join(__dirname, `${className}.java`);
  } else {
    filename = path.join(__dirname, `temp.${language}`);
  }

  fs.writeFileSync(filename, code);

  let compileCommand;
  let executeCommand;
  switch (language) {
    case "c":
      compileCommand = `gcc ${filename} -o temp.exe`;
      executeCommand = `temp.exe`;
      break;
    case "cpp":
      compileCommand = `g++ ${filename} -o temp.exe`;
      executeCommand = `temp.exe`;
      break;
    case "java":
      compileCommand = `javac ${filename}`;
      executeCommand = `java ${path.basename(filename, ".java")}`;
      break;
    default:
      return res.status(400).send("Unsupported language");
  }

  exec(compileCommand, (compileError, compileStdout, compileStderr) => {
    if (compileError) {
      return res.status(500).send(compileStderr);
    }
    exec(
      executeCommand,
      { cwd: path.dirname(filename) },
      (executeError, executeStdout, executeStderr) => {
        if (executeError) {
          return res.status(500).send(executeStderr);
        }
        res.send(executeStdout);
      }
    );
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
