# zenhan

Switch the mode of input method editor from terminal. This is a tool similar to im-select.

see https://github.com/VSCodeVim/Vim#input-method

## Setting example

```
"vim.autoSwitchInputMethod.enable": true,
"vim.autoSwitchInputMethod.defaultIM": "0",
"vim.autoSwitchInputMethod.obtainIMCmd": "D:\\bin\\zenhan.exe",
"vim.autoSwitchInputMethod.switchIMCmd": "D:\\bin\\zenhan.exe {im}"
```

## see also

[Qiita (Japanese)](https://qiita.com/iuchi/items/9ddcfb48063fc5ab626c)

## build

wsl2で以下のコマンドを実行してください。

```
sudo apt update
sudo apt install -y mingw-w64
bash build.sh
```
