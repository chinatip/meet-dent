import React from 'react'
import moment from 'moment'
import _ from 'lodash'
import styled from 'styled-components'
import { compose, withHandlers, withStateHandlers, withPropsOnChange } from 'recompose'

import { Button, Select } from 'common'
import { stringToMoment, momentToString } from 'common/utils'
import { FETCH, POST, APPOINTMENT, CLINIC, DENTIST, DENTIST_TIMESLOT, CREATE, UPDATE, DELETE, LIST } from 'services'

const DATE_FORMAT = 'DD MMM YYYY'
const TIME_FORMAT = 'H:mm'

// --------------------------------- Appointment Status ---------------------------------
const APPOINTMENT_STATUS = [
  { label: 'Waiting', value: 'waiting' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Cancel', value: 'cancel' }
]

const SelectStatus = withStateHandlers(
  ({ status }) => ({ select: status }),
  {
    updateStatus: ({}, { status, _id }) => (value) => {
      POST(APPOINTMENT, UPDATE, { status: value, _id })

      return { select: value }
    }
  }
)(({ select, updateStatus }) => {
    return ( select === 'cancel' || select === 'done'? 
      <p>{select}</p>
      : <Select value={select || select} onChange={updateStatus} options={APPOINTMENT_STATUS} />
  )}
)

const EstimateTime = withStateHandlers(
  ({ time }) => ({ value: time }),
  {
    updateTime: ({ value }, { _id }) => (e) => {
      POST(APPOINTMENT, UPDATE, { estimateTime: e.target.value, _id })

      return { value: e.target.value }
    }
  }
)(({ value, updateTime }) => {
    
    return <input value={value} onChange={updateTime} />
  }
)

const formatStatusTable = ({ appointments, editable, updateTreatmentHistory, clinic }) => {
  let columns = [
    {
      title: 'เวลา',
      dataIndex: 'slot',
      key: 'time',
      render: (slot) => {
        const { startTime, endTime } = slot
        const start = stringToMoment(startTime)
        const end = stringToMoment(endTime)

        return (
          <div>
            <p>{start.format(DATE_FORMAT)}</p>
            <p>{`${start.format(TIME_FORMAT)} - ${end.format(TIME_FORMAT)}`}</p>
          </div>
        )
    }
    }, {
      title: 'หมอ',
      dataIndex: 'slot.dentist',
      key: 'dentist',
      render: (dentist) => <p>{`${dentist.firstname} ${dentist.lastname}`}</p>
    }, {
      title: 'การรักษา',
      dataIndex: 'treatment.name',
      key: 'treatment',
      render: (treatment) => <p>{treatment}</p>
    }, {
      title: 'คนไข้',
      dataIndex: 'patient',
      key: 'patient',
      render: (patient) => (
        <div>
          <p>{`${patient.firstname} ${patient.lastname}`}</p>
          <p>{patient.phone}</p>
        </div>
      )
    }
  ]

  const estTimeCol = {
    title: 'เวลาที่ใช้',
    dataIndex: 'estimateTime',
    key: 'estimateTime'
  }
  const statusCol = {
    title: 'สถานะ',
    dataIndex: 'status',
    key: 'status',
  }
  const treatmentHistoryCol = {
    title: 'ประวัติ',
    dataIndex: 'report',
    key: 'report',
  }

  if (editable) {
    statusCol.render = (status, { _id }) => <SelectStatus status={status} _id={_id} /> 
    estTimeCol.render = (estTime, { _id }) => <EstimateTime time={estTime} _id={_id} />
  } else {
    statusCol.render = (status) => <p>{status}</p> 
    estTimeCol.render = (estTime) => <p>{estTime}</p>
  }

  treatmentHistoryCol.render = (report, props) => {
    if (report) {
      return <Button value={'แก้ไข'} onClick={() => updateTreatmentHistory({ report, appointment: props })} />
    }

    return <Button value={'เพิ่ม'} onClick={() => updateTreatmentHistory({ report, appointment: props })} />
  }

  columns = columns.concat([
    estTimeCol,
    statusCol,
    treatmentHistoryCol
  ])
  
  const dataSource = appointments.filter((app) => app.slot.clinic._id === clinic._id)

  return { dataSource, columns }
}

export const formatStatus = (props) => {
  if (props.appointments) {
    return formatStatusTable(props)
  }

  return { dataSource: [], columns: [] }
}

// --------------------------------- Manage TimeTable ---------------------------------

const SlotContainer = styled.div`
  display: flex

  div {
    font-weight: bold
  }
`
const SlotButton = styled.div`
  width: 20px;
  height: 20px;
  cursor: pointer;
  border-radius: 4px;
  background: grey;

  ${props => props.active && 'background: green'};
`

const enhanceSlotController = compose(
  withPropsOnChange(['slots'], ({ slots }) => {
    const { full, half } = slots
    return { fullSlot: full.slot, halfSlot: half.slot }
  }),
  withHandlers(
    {
      updateSlot: () => async (slot, updateDTSlots) => {
        const { _id, value, clinic, dentist, time: { startTime, endTime } } = slot

        if(slot._id && slot.value) {
          await POST(DENTIST_TIMESLOT, DELETE, { _id })
        } else {
          const body = { clinic, dentist, startTime: momentToString(startTime), endTime: momentToString(endTime) }
          await POST(DENTIST_TIMESLOT, CREATE, body)
        }
        const dtslots = await POST(DENTIST_TIMESLOT, LIST)

        updateDTSlots(dtslots)
      }
    },
  ) 
)

const SlotController = enhanceSlotController(
  ({ slots: { full, half }, fullSlot, halfSlot, updateSlot, updateDTSlots }) => {
    return (
      <div>
        <div>{full.label}</div>
        <SlotButton active={!!fullSlot.value} onClick={() => updateSlot(fullSlot, updateDTSlots)} />
        <div>{half.label}</div>
        <SlotButton active={!!halfSlot.value} onClick={() => updateSlot(halfSlot, updateDTSlots)} />
      </div>
    )
  }
)

const formatTimetableData = ({ clinic, date, dentistTimeslots }) => {
  const { dentists } = clinic
  const clinicSlots = _.filter(dentistTimeslots, (s) => s.clinic._id === clinic._id)

  return _.forEach(dentists, (dent) => {
    const timeslots = {}
    const dentistSlots = _.filter(clinicSlots, (slot) => {
      const { dentist, startTime, endTime } = slot
      const sDate = stringToMoment(startTime)
      const isDentistSlot = dentist._id === dent._id && sDate.isSame(date, 'days')

      if (isDentistSlot) {
        const time = sDate.format(TIME_FORMAT)
        timeslots[time] = {}
        timeslots[time]._id = slot._id
        timeslots[time].value = true
        timeslots[time].time = { startTime, endTime }
      }

      return isDentistSlot
    })

    _.range(8, 20).forEach((hour) => {
      ['00', '30'].forEach((minute) => {
        const time = `${hour}:${minute}`
        if (!timeslots[time]) {
          const startTime = moment(`${date.format(DATE_FORMAT)} ${time}`, `${DATE_FORMAT} ${TIME_FORMAT}`)
          const endTime = moment(`${date.format(DATE_FORMAT)} ${minute === '00'? `${hour}:30`: `${hour+1}:00`}`, `${DATE_FORMAT} ${TIME_FORMAT}`)
          timeslots[time] = {}
          timeslots[time].value = false
          timeslots[time].time = { startTime, endTime }
        } 

        timeslots[time].clinic = clinic._id
        timeslots[time].dentist = dent._id
      })
    })

    dent.timeslots = timeslots
  })
}

const formatTimetableTable = (dentists, clinic, { updateDTSlots }) => {
  const columns = [{
    title: 'Dentist',
    key: 'dentist',
    render: (dentist) => { 
      const { firstname, lastname } = dentist     
      return <p>{`${firstname} ${lastname}`}</p>
    }
  }]

  const getSlotController = ({ _id, slots }) => <SlotController slots={slots} updateDTSlots={updateDTSlots} />
  _.range(8, 20).forEach((hour) => {
    const full = `${hour}:00`
    const half = `${hour}:30`

    columns.push({
      title: full,
      dataIndex: `timeslots`,
      key: full,
      render: (timeslots) => {
        return getSlotController({ 
          slots: { 
            full: {
              label: full,
              slot: timeslots[full]
            }, 
            half: {
              label: half,
              slot: timeslots[half]
            }, 
          } 
        })
      }
    })
    
  })
  
  return { dataSource: dentists, columns}
}

export const formatTimetable = (props) => {
  const { clinic, date, dentistTimeslots } = props
  if (clinic && date && dentistTimeslots) {
    const dentists = formatTimetableData(props)

    return formatTimetableTable(dentists, clinic, props)
    return { dataSource: [], columns: [] }
  }

  return { dataSource: [], columns: [] } 
}

// --------------------------------- Manage Dentist ---------------------------------

const DeleteButton = withHandlers(
  { 
    onDelete: ({ clinic, _id }) => () => {
      POST(DENTIST, DELETE, { _id })
      const dentists = clinic.dentists.filter((d) => d._id && d._id !== _id)
      POST(CLINIC, UPDATE, { _id: clinic._id, dentists })
    }
  }
)( 
  ({ onDelete }) => <Button onClick={onDelete} value={'X'} />
)

const formatDentistsTable = ({ dentists, clinic, onEdit }) => {
  const DeleteButtonWithClinic = (props) => <DeleteButton clinic={clinic} {...props} />
  const EditButton = (props) => <Button onClick={() => onEdit(props)} value={'แก้ไข'} />

  const columns = [
    {
      title: 'ชื่อ',
      dataIndex: 'firstname',
      key: 'firstname'
    }, {
      title: 'นามสกุล',
      dataIndex: 'lastname',
      key: 'lastname',
    }, {
      title: 'การรักษา',
      dataIndex: 'treatments',
      key: 'treatments',
      render: (treatments) => {
        return <div>{ treatments.map((t) => <p>{t.name}</p>) }</div>
      }
    }, {
      title: 'เบอร์โทร',
      dataIndex: 'phone',
      key: 'phone',
    }, {
      title: 'แก้ไข',
      dataIndex: '_id',
      key: 'edit',
      render: (id, props) => (
        <div style={{ display: 'flex' }}>
          <EditButton {...props} />
          <DeleteButtonWithClinic {...props} />
        </div>
      )
    }
  ]  

  return { dataSource: dentists, columns }
}

export const formatDentists = (props) => {
  const { dentists } = props
  if (dentists) {
    return formatDentistsTable(props)
  }

  return { dataSource: [], columns: [] }
}

// --------------------------------- Manage Patient ---------------------------------

const formatPatientsTable = ({ patients }) => {
  const columns = [
    {
      title: 'ชื่อ',
      dataIndex: 'firstname',
      key: 'firstname'
    }, {
      title: 'นามสกุล',
      dataIndex: 'lastname',
      key: 'lastname',
    }, {
      title: 'เบอร์โทร',
      dataIndex: 'phone',
      key: 'phone',
    }
  ]  

  return { dataSource: patients, columns }
}

export const formatPatients = (props) => {
  return formatPatientsTable(props)
}