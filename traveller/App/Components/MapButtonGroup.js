import React, { PropTypes } from 'react'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'

class MapButtonGroup extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      selectedIndex: 0
    }
    this.updateIndex = this.updateIndex.bind(this)
  }
  updateIndex (selectedIndex) {
    this.setState({selectedIndex})
    this.props.setStateOfButtonGroup(this.props.category, this.props.buttons[selectedIndex])
  }

  render () {
    const buttons = this.props.buttons
    const { selectedIndex } = this.state
    return (
      <ButtonGroup
        onPress={this.updateIndex}
        selectedIndex={selectedIndex}
        buttons={buttons} />
    )
  }
}

export default MapButtonGroup
