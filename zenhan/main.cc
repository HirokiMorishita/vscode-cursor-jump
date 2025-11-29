#include <cstdio>
#include <cstdlib>
#include <windows.h>

int
main(int argc, char** argv)
{
  constexpr LPARAM IMC_GETOPENSTATUS = 5;
  constexpr LPARAM IMC_SETOPENSTATUS = 6;

  auto hwnd = GetForegroundWindow();
  if (!hwnd)
    return 0;

  auto ime = ImmGetDefaultIMEWnd(hwnd);
  if (!ime)
    return 0;

  LPARAM current = SendMessage(ime, WM_IME_CONTROL, IMC_GETOPENSTATUS, 0);
  if (argc >= 2) {
    LPARAM state =std::atoi(argv[1]);
    SendMessage(ime, WM_IME_CONTROL, IMC_SETOPENSTATUS, state);
  }
  std::printf("%d\n", current);
  return 0;
}