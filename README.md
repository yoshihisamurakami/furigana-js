# Overview
"Furigana-kun" is a Chrome extension that adds furigana to Japanese web pages.

## What is Furigana?
Furigana is small Japanese text written above or next to kanji to show you how to read and pronounce it.

For example, the kanji **日本** can have **にほん** (nihon) written above it as furigana.

Furigana is especially helpful for Japanese learners because it makes unfamiliar kanji easier to read.

# Operation Overview
![Demo](./furigana.gif)

# About wasm code
The code for wasm/kagome.wasm is available at https://github.com/yoshihisamurakami/furigana-wasm.

## Libraries Used

This extension uses the following open-source library:

| Library                                        | Purpose                                                     | License |
| ---------------------------------------------- | ----------------------------------------------------------- | ------- |
| [Kagome v2](https://github.com/ikawaha/kagome) | Japanese morphological analysis and word reading extraction | MIT     |

Special thanks to the developers and contributors of Kagome.

## License

This project is licensed under the MIT License.

You are free to use, modify, and distribute this software in accordance with the terms of the MIT License.

See the `LICENSE` file for details.
