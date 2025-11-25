// C# has various value types including strings, numbers, booleans, and characters

using System;
using Internal;

class Program
{
  static void Main()
  {
    // Strings can be concatenated with +
    Console.WriteLine("hello" + " world");

    // Integer types
    int wholeNumber = 42;
    long bigNumber = 1000000L;
    short smallNumber = 100;
    byte tinyNumber = 255;
    Console.WriteLine($"Integer: {wholeNumber}");
    Console.WriteLine($"Long: {bigNumber}");
    Console.WriteLine($"Short: {smallNumber}");
    Console.WriteLine($"Byte: {tinyNumber}");

    // Floating point types
    float singlePrecision = 3.14f;
    double doublePrecision = 2.71828;
    decimal preciseDecimal = 123.456m;
    Console.WriteLine($"Float: {singlePrecision}");
    Console.WriteLine($"Double: {doublePrecision}");
    Console.WriteLine($"Decimal: {preciseDecimal}");

    // Arithmetic operations
    Console.WriteLine($"1+1 = {1 + 1}");
    Console.WriteLine($"7.0/3.0 = {7.0 / 3.0}");
    Console.WriteLine($"10 % 3 = {10 % 3}"); // Modulo

    // Character type
    char letter = 'A';
    char digit = '7';
    Console.WriteLine($"Character: {letter}");
    Console.WriteLine($"Digit: {digit}");

    // Boolean values and operators
    bool isTrue = true;
    bool isFalse = false;
    Console.WriteLine($"True AND False: {isTrue && isFalse}");
    Console.WriteLine($"True OR False: {isTrue || isFalse}");
    Console.WriteLine($"NOT True: {!isTrue}");

    // Comparison operators return booleans
    Console.WriteLine($"5 > 3: {5 > 3}");
    Console.WriteLine($"5 == 3: {5 == 3}");
    Console.WriteLine($"5 != 3: {5 != 3}");
  }
}