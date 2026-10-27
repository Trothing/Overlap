import { describeRuntime, runTimeZoneSpike } from './spike'

describe('time zone spike on the Node engine', () => {
    it('passes every check', () => {
        const failed = runTimeZoneSpike().filter((check) => !check.pass)
        expect(failed).toEqual([])
    })

    it('describes the runtime', () => {
        const info = describeRuntime()
        expect(info.deviceZone).not.toBe('error')
    })
})
