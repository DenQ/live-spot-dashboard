export type InstrumentId = string

export type Instrument = {
  id: InstrumentId
  ticker: string
  name: string
  venue: string
  currency: string
}
