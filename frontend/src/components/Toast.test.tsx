import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider } from '../context/ToastContext'
import { useToast } from '../context/toast-context'
import ToastHost from './Toast'

function NotifyProbe({ messages }: { messages: string[] }) {
  const { notify } = useToast()
  return (
    <div>
      {messages.map((m, i) => (
        <button key={i} onClick={() => notify(m)}>{`avisar-${i}`}</button>
      ))}
    </div>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderToasts(messages: string[]) {
  return render(
    <ToastProvider>
      <NotifyProbe messages={messages} />
      <ToastHost />
    </ToastProvider>,
  )
}

describe('ToastHost', () => {
  it('muestra un aviso con su botón de cierre', () => {
    renderToasts(['Se perdió la señal'])
    fireEvent.click(screen.getByText('avisar-0'))

    expect(screen.getByText('Se perdió la señal')).toBeTruthy()
    expect(screen.getByLabelText('Cerrar aviso')).toBeTruthy()
  })

  it('el botón de cierre descarta el aviso al instante', () => {
    renderToasts(['Fallo de red'])
    fireEvent.click(screen.getByText('avisar-0'))
    fireEvent.click(screen.getByLabelText('Cerrar aviso'))

    expect(screen.queryByText('Fallo de red')).toBeNull()
  })

  it('no apila avisos con el mismo mensaje', () => {
    renderToasts(['Fallo de red', 'Fallo de red'])
    fireEvent.click(screen.getByText('avisar-0'))
    fireEvent.click(screen.getByText('avisar-1'))

    expect(screen.getAllByText('Fallo de red')).toHaveLength(1)
  })

  it('se descarta solo a los 6 segundos', () => {
    renderToasts(['Fallo transitorio'])
    fireEvent.click(screen.getByText('avisar-0'))
    expect(screen.getByText('Fallo transitorio')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(screen.getByText('Fallo transitorio')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Fallo transitorio')).toBeNull()
  })

  it('la región de avisos es aria-live para lectores de pantalla', () => {
    renderToasts(['Fallo'])
    fireEvent.click(screen.getByText('avisar-0'))

    const region = screen.getByText('Fallo').closest('[aria-live]')
    expect(region?.getAttribute('aria-live')).toBe('polite')
  })
})
