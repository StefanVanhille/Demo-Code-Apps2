import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import BudgetGrid from './components/BudgetGrid'
import './App.css'

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <div className="app-shell">
        <header className="app-hero">
          <p className="app-kicker">Budget Studio</p>
          <h1>Inline edits for the most important budget fields.</h1>
          <p className="app-subtitle">
            Update name, consumed amount, and owner directly in the grid. Click out and
            each change saves immediately.
          </p>
        </header>
        <main className="app-content">
          <BudgetGrid />
        </main>
      </div>
    </FluentProvider>
  )
}

export default App
