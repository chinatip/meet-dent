import _ from 'lodash'
import React, { Component } from 'react'
import styled, { css } from 'styled-components'
import { Form } from 'antd'

import { stringToMoment } from 'common/utils'

import { FormContainer, FormItem, NavigationButton, Row } from 'common/form'

const TimetableContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const cssSelectSlot = css`
  background: #40a9ff;
  color: #fff;
`
const Timeslot = styled.div`
  border: 1px solid #40a9ff;
  border-radius: 4px;
  padding: 10px;
  max-width: 60px;
  text-align: center;
  margin-bottom: 5px;
  cursor: pointer;

  &:hover {
    ${cssSelectSlot}
  }

  ${props => props.select && cssSelectSlot}
`

const getOptions = (list) => {
  const options = []
  _.forEach(list, (l) => {
    options.push({ label: `${l.firstname} ${l.lastname}`, value: l._id })
  })

  return options
}

class Step2Form extends Component {
  componentDidMount () {
    this.initForm(this.props)
  }

  componentWillUpdate (nextProps, nextState) {
    if (nextProps.data !== this.props.data) {
      this.initForm(nextProps)
    }
  }

  initForm({ form: { setFields }, data: { dentist, date, timeslot }}) {
    setFields({
      dentist: {
        value: dentist,
      },
      date: {
        value: date,
      },
      timeslot: {
        value: timeslot
      }
    })
  }

  handleTimeslot = (slotId) => () => {
    const { form: { setFields }} = this.props

    setFields({
      timeslot: {
        value: slotId
      }
    })
  }

  handleSubmit = (e) => {
    const { form, onSubmit } = this.props

    e.preventDefault()
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        onSubmit(values)
      }
    })
  }

  renderTimetable() {
    const { form: { getFieldValue }, appointments, timeslots } = this.props
    
    const dentist = getFieldValue('dentist')
    const date = getFieldValue('date')

    if (dentist && date) {
      const selectedDateAppointments = appointments.filter((app) => {
        const appDate = stringToMoment(app.slot.startTime)
        return appDate.diff(date, 'days') === 0
      })

      const dentistSlots = timeslots.filter((slot) => {
        const slotDate = stringToMoment(slot.startTime)
        
        return slot.dentist._id === dentist && slotDate.diff(date, 'days') === 0
      })

      const availableTimeslots = dentistSlots.filter((slot) => 
        !(selectedDateAppointments.filter((app) => {
          return app.slot._id === slot._id
        }).length === 1)
      )

      const timeslot = getFieldValue('timeslot')

      return (
        <TimetableContainer>
          {
            availableTimeslots.map((slot) => {
              const date = stringToMoment(slot.startTime).format('HH:mm')

              return (
                <Timeslot select={slot._id === timeslot} onClick={this.handleTimeslot(slot._id)}>
                  {date}
                </Timeslot>
              )
            })
          }
        </TimetableContainer>
      )
    }

    return <noscript />
  }

  render() {
    const { form: { getFieldDecorator }, dentists, onBackStep } = this.props

    return (
      <FormContainer width={700}>
        <FormItem label={'ทันตแพทย์'} field={'dentist'} message={'กรุณาทันตแพทย์'} getFieldDecorator={getFieldDecorator} options={getOptions(dentists)} />
        <FormItem label={'วันที่นัดหมาย'} field={'date'} message={'กรุณาวันที่'} getFieldDecorator={getFieldDecorator} date />
        <FormItem label={'วันที่นัดหมาย'} field={'timeslot'} message={'กรุณาวันที่'} getFieldDecorator={getFieldDecorator} hidden />
        { this.renderTimetable() }
        <NavigationButton onBackStep={onBackStep} onSubmit={this.handleSubmit} />
      </FormContainer>
    )
  }
}

const WrappedForm = Form.create()(Step2Form)

class Step2 extends Component {
  render() {
    const { clinics } = this.props

    return (
      <WrappedForm {...this.props} />
    )
  }
}

export default Step2