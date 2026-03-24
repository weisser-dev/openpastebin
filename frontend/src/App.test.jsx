import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.querySelector('.app')).toBeTruthy()
  })

  it('displays the header with logo', () => {
    render(<App />)
    const logo = screen.getByText('OpenPasteBin')
    expect(logo).toBeTruthy()
  })

  it('displays USPs banner', () => {
    render(<App />)
    const usp1 = screen.getByText(/No data stored permanently/i)
    const usp2 = screen.getByText(/No logs created/i)
    expect(usp1).toBeTruthy()
    expect(usp2).toBeTruthy()
  })

  it('displays View Existing Paste section', () => {
    render(<App />)
    const viewHeading = screen.getByText(/View Existing Paste/i)
    expect(viewHeading).toBeTruthy()
  })

  it('displays Create New Paste section', () => {
    render(<App />)
    const createHeading = screen.getByText(/Create New Paste/i)
    expect(createHeading).toBeTruthy()
  })

  it('has text/code tab by default', () => {
    render(<App />)
    const textTab = screen.getByText(/Text\/Code/i)
    expect(textTab.closest('.tab')).toHaveClass('active')
  })

  it('shows password input field', () => {
    render(<App />)
    const passwordInput = screen.getByPlaceholderText(/Protect with password/i)
    expect(passwordInput).toBeTruthy()
  })

  it('shows max views dropdown', () => {
    render(<App />)
    const maxViewsLabel = screen.getByText(/Max Views \(Burn After Read\)/i)
    expect(maxViewsLabel).toBeTruthy()
  })

  it('shows split token checkbox', () => {
    render(<App />)
    const splitCheckbox = screen.getByText(/Split Token/i)
    expect(splitCheckbox).toBeTruthy()
  })

  it('shows prettify button', () => {
    render(<App />)
    const prettifyBtn = screen.getByText(/Prettify/i)
    expect(prettifyBtn).toBeTruthy()
  })
})
