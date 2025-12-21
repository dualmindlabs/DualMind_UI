import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local server
        await page.goto("http://localhost:8000/index.html")

        # Wait for app to load
        await page.wait_for_selector(".app")

        # Inject complex message directly
        complex_message = r"""
# Math & Markdown Test

Inline math: $E = mc^2$ and subscript $x_i + y_i = z_i$.

Block math:
$$
\sum_{i=0}^n i^2 = \frac{n(n+1)(2n+1)}{6}
$$

**Markdown Table:**
| Col A | Col B |
|---|---|
| Val 1 | Val 2 |

```javascript
console.log("Hello Code");
```
"""
        # Remove newlines to avoid JS string issues if not careful, but triple quotes in python handle it.
        # We need to escape backslashes for JS string.
        js_message = complex_message.replace("\\", "\\\\").replace("`", "\\`")

        await page.evaluate(f"""
            const msg = `{js_message}`;
            // Force show chat results
            document.getElementById('arenaResults').hidden = true;
            document.getElementById('chatResults').hidden = false;

            renderSingleResponse({{
                model: {{ displayName: 'MathBot' }},
                message: msg
            }});
        """)

        # Wait for rendering
        await asyncio.sleep(2)

        # Take screenshot
        await page.screenshot(path="chat_math_fixed.png")
        print("Screenshot saved to chat_math_fixed.png")

        await browser.close()

asyncio.run(run())
