import React from 'react'
import moment from 'moment'
import _ from 'lodash'
import styled from 'styled-components'
import { withStateHandlers } from 'recompose'

const DATE_FORMAT = 'DD MMM YYYY'
const TIME_FORMAT = 'HH:mm'

function dataById(data) {
  const dataById = {}

  data.forEach((d) => {
    dataById[d.id] = d
  })

  return dataById
}

// --------------------------------- Appointment Status ---------------------------------

const formatStatusData = ({ appointments, timeslots, dentists, patients, users, treatments }) => {
  const timeslotsById = dataById(timeslots)
  const dentistsById = dataById(dentists)
  const patientsById = dataById(patients)
  const usersById = dataById(users)
  const treatmentsById = dataById(treatments)

  return appointments.map((appointment, idx) => {
    const { patient_id, timeslot_id, treatment_id } = appointment
    const timeslot = timeslotsById[timeslot_id]
    const dentist = usersById[dentistsById[timeslot.dentist_id].id]
    const patient = usersById[patientsById[patient_id].id]
    const treatment = treatmentsById[treatment_id]

    return { 
      key: idx,
      ...appointment, 
      timeslot,
      dentist,
      patient,
      treatment
    }
  })
}

const formatStatusTable = (appointments) => {
  const columns = [{
    title: 'Time',
    dataIndex: 'timeslot',
    key: 'time',
    render: (slot) => {
      const { startTime, endTime } = slot
      const start = moment(startTime)
      const end = moment(endTime)

      return (
        <div>
          <p>{start.format(DATE_FORMAT)}</p>
          <p>{`${start.format(TIME_FORMAT)} - ${end.format(TIME_FORMAT)}`}</p>
        </div>
      )
    }
  }, {
    title: 'Dentist',
    dataIndex: 'dentist',
    key: 'dentist',
    render: (dentist) => <p>{`${dentist.name} ${dentist.lastname}`}</p>
  }, {
    title: 'Action',
    dataIndex: 'treatment.name',
    key: 'treatment',
  }, {
    title: 'Patient',
    dataIndex: 'patient',
    key: 'patient',
    render: (patient) => <p>{`${patient.name} ${patient.lastname}`}</p>
  }, {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status) => {
      if (status === 'W') return <p>Waiting</p>
    }
  }];
  
  return { dataSource: appointments, columns}
}

export const formatStatus = (props) => {
  if (props) {
    const appointments = formatStatusData(props)

    return formatStatusTable(appointments)
  }

  return 
}

// --------------------------------- Manage TimeTable ---------------------------------

const updateSlotToTimetable = ({ dentist, slot, availableSlot }) => {
  console.log(dentist, slot, availableSlot)
}

const SlotContainer = styled.div`
  display: flex;

  div {
    font-weight: bold;
  }
`

const SlotController = withStateHandlers(
  ( ({ availableSlot }) => ({ slot: availableSlot.value }) ),
    { 
      updateSlot: ({ slot }, { dentist, availableSlot }) => (value) => ({ 
        slot: value < 0? 0: value, 
        update: updateSlotToTimetable({ dentist, slot: value < 0? 0: value, availableSlot }) 
      })
    }
  ) (({ slot, updateSlot, updateTable }) => {

    return (
      <SlotContainer>
        <button onClick={() => updateSlot(slot-1)}>-</button>
        <div>{slot}</div>
        <button onClick={() => updateSlot(slot+1)}>+</button>
      </SlotContainer>
    )
  }
)

const formatTimetableData = ({ timeslots, dentists, users }) => {
  const timeslotsById = dataById(timeslots)
  const dentistsById = dataById(dentists)
  const usersById = dataById(users)

  return timeslots.map((slot, idx) => {
    const timeslot = timeslotsById[slot.id]
    const dentist = usersById[dentistsById[timeslot.dentist_id].id]

    return { 
      key: idx,
      timeslot,
      dentist
    }
  })
}

const formatTimetableTable = ({ timeslots, dentists, users }) => {
  const columns = [{
    title: 'Dentist',
    dataIndex: 'dentist',
    key: 'dentist',
    render: (dentist) => {
      const { name, lastname } = dataById(users)[dentist.person_id]
      
      return <p>{`${name} ${lastname}`}</p>
    }
  }];

  _.range(9, 21).forEach((timeslot) => {
    columns.push({
      title: `${timeslot - 1} - ${timeslot}`,
      dataIndex: timeslot,
      key: timeslot,
      render: (availableSlot, { dentist, timeslot }) => {
        return <SlotController availableSlot={availableSlot} dentist={dentist} />
      }
    })
  })

  const dataSource = dentists.map((dent, idx) => {
    const dentist = {}
    _.range(9, 21).forEach((time) => {
      dentist[time] = { label: time, value: Math.round(Math.random()*5)}
    })
    dentist.key = idx
    dentist.dentist = dent

    return dentist
  })
  
  return { dataSource, columns}
}

export const formatTimetable = (props) => {
  if (props) {
    const timeslots = formatTimetableData(props)

    return formatTimetableTable({ ...props, timeslots })
  }

  return 
}