
from playwright.sync_api import sync_playwright

def verify_login_redirect():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test 1: Access root login.html - should redirect to login/index.html
        print('Testing root login.html redirect...')
        page.goto('http://localhost:8000/login.html')

        # Check if URL changed to login/index.html
        print(f'Final URL: {page.url}')

        # Take screenshot of login page
        page.screenshot(path='verification/login_redirect.png')

        browser.close()

if __name__ == '__main__':
    verify_login_redirect()
